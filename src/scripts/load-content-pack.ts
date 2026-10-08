/**
 * Loads a content pack (certification details, study-guide blog posts and
 * question spreadsheets) into the test or live database.
 *
 *   npx tsx src/scripts/load-content-pack.ts --pack=content/test-pack --target=test
 *   npx tsx src/scripts/load-content-pack.ts --pack=content/test-pack --target=test --apply
 *   npx tsx src/scripts/load-content-pack.ts --pack=content/test-pack --target=live --apply
 *
 * Without --apply nothing is written: it only prints what would change.
 * Safe to re-run: posts are matched by slug, certifications by slug, and
 * questions by their content fingerprint, so nothing is ever duplicated.
 * It never deletes anything.
 *
 * The database is never restructured by this script: it runs with
 * NODE_ENV=production and PAYLOAD_MIGRATING=true, which turns off Payload's
 * automatic schema push. The live connection string is read from the
 * git-ignored file .env.live-db.
 */
import 'dotenv/config'
import { existsSync, readdirSync, readFileSync } from 'fs'
import path from 'path'

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=')
    return [k, v ?? 'true']
  }),
)
const packDir = args.pack || 'content/test-pack'
const target = args.target
const apply = args.apply === 'true'
const publishSlugs = (args.publish || '').split(',').filter(Boolean)

if (target !== 'test' && target !== 'live') {
  console.error('Use --target=test or --target=live')
  process.exit(1)
}

const hostOf = (url: string) => new URL(url).host.replace(/^(ep-[a-z]+-[a-z]+).*/, '$1-***')

if (target === 'live') {
  const raw = readFileSync('.env.live-db', 'utf8')
  const url = raw.match(/postgres(?:ql)?:\/\/[^\s'"]+/)?.[0]
  if (!url) throw new Error('.env.live-db does not contain a connection string')
  if (process.env.DATABASE_URL && new URL(url).host === new URL(process.env.DATABASE_URL).host) {
    throw new Error('.env.live-db points at the same database as .env - refusing')
  }
  process.env.DATABASE_URL = url
}
// No automatic schema changes from this script, on either database.
;(process.env as Record<string, string>).NODE_ENV = 'production'
process.env.PAYLOAD_MIGRATING = 'true'

console.log(`Target: ${target.toUpperCase()} database (${hostOf(process.env.DATABASE_URL || '')})`)
console.log(apply ? 'Mode: APPLY (changes will be saved)\n' : 'Mode: PREVIEW (nothing will be saved)\n')

const { getPayload } = await import('payload')
const { default: config } = await import('../payload.config')
const { convertMarkdownToLexical, editorConfigFactory } = await import('@payloadcms/richtext-lexical')
const { readSheet } = await import('read-excel-file/node')
const { rowsFromSheet, checkQuestionHeader } = await import('../import/columns')
const { checkQuestionRows, importQuestionRows } = await import('../import/questions.server')
const { matchCategory, matchStatus } = await import('../collections/Certifications/options')

const payload = await getPayload({ config })
const ctx = { disableRevalidate: true }

// ---------- 1. Read the pack ----------

type Domain = { name: string; weight: number; guideSlug: string }
type CertSpec = {
  title: string
  slug: string
  examCode: string
  isSiteCode: boolean
  vendor: string
  certCategory: NonNullable<ReturnType<typeof matchCategory>>
  examStatus: NonNullable<ReturnType<typeof matchStatus>>
  passingScore: number
  examQuestionCount: number
  durationMinutes: number
  delivery: string
  domains: Domain[]
}

function parseCertDetails(md: string): CertSpec[] {
  const specs: CertSpec[] = []
  for (const block of md.split(/^## /m).slice(1)) {
    const title = block.split('\n')[0].trim()
    const field = (re: RegExp) => block.match(re)?.[1]?.trim() ?? ''
    const slug = field(/slug:\s*([a-z0-9-]+)/)
    const examCodeRaw = field(/exam code:\s*([^|\n]+)/)
    const certCategory = matchCategory(field(/category:\s*([^|\n]+)/))
    const examStatus = matchStatus(field(/status:\s*([^|\n]+)/))
    const domains = [...block.matchAll(/^\s*-\s*([^|\n]+?)\s*\|\s*(\d+)\s*\|\s*([a-z0-9-]+)\s*$/gm)].map((m) => ({
      name: m[1].trim(),
      weight: Number(m[2]),
      guideSlug: m[3].trim(),
    }))
    if (!slug || !certCategory || !examStatus || domains.length === 0) {
      throw new Error(`Could not read the details for "${title}" in certification-details.md`)
    }
    specs.push({
      title,
      slug,
      examCode: examCodeRaw.replace(/\(.*\)/, '').trim(),
      isSiteCode: /certgenius code|site code/i.test(examCodeRaw),
      vendor: field(/vendor:\s*([^|\n]+)/),
      certCategory,
      examStatus,
      passingScore: Number(field(/pass score:\s*(\d+)/)),
      examQuestionCount: Number(field(/exam questions:\s*(\d+)/)),
      durationMinutes: Number(field(/duration:\s*(\d+)/)),
      delivery: field(/delivery:\s*([^|\n]+)/),
      domains,
    })
  }
  return specs
}

type BlogSpec = { title: string; slug: string; excerpt: string; videoUrl: string; markdown: string; file: string }

function parseBlog(file: string): BlogSpec {
  const raw = readFileSync(file, 'utf8').replace(/\r\n/g, '\n')
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!m) throw new Error(`${file}: missing front matter`)
  const fm = Object.fromEntries(
    m[1].split('\n').map((line) => {
      const i = line.indexOf(':')
      return [line.slice(0, i).trim(), line.slice(i + 1).trim().replace(/^"(.*)"$/, '$1')]
    }),
  )
  if (!fm.title || !fm.slug) throw new Error(`${file}: title and slug are required`)
  return { title: fm.title, slug: fm.slug, excerpt: fm.excerpt || '', videoUrl: fm.videoUrl || '', markdown: m[2].trim(), file }
}

const certSpecs = parseCertDetails(readFileSync(path.join(packDir, 'certification-details.md'), 'utf8'))
const blogDir = path.join(packDir, 'blogs')
const blogs = existsSync(blogDir)
  ? readdirSync(blogDir).filter((f) => f.endsWith('.md')).map((f) => parseBlog(path.join(blogDir, f)))
  : []
const questionFiles = readdirSync(packDir).filter((f) => /questions\.(xlsx|csv)$/i.test(f))

// Every study guide named in the details must have a blog file.
for (const spec of certSpecs) {
  for (const d of spec.domains) {
    if (!blogs.some((b) => b.slug === d.guideSlug)) {
      throw new Error(`${spec.slug}: no blog file with slug "${d.guideSlug}" for domain "${d.name}"`)
    }
  }
}
for (const b of blogs) if (b.videoUrl) console.log(`Note: ${b.slug} has a videoUrl, which is stored once the blog template gets its video field (Phase 5).`)

// ---------- 2. Blog posts ----------

console.log('== Study-guide blog posts')
const editorConfig = await editorConfigFactory.default({ config: payload.config })
const firstAdmin = (await payload.find({ collection: 'users', limit: 1, sort: 'createdAt', depth: 0 })).docs[0]
const postIds = new Map<string, number>()

for (const blog of blogs) {
  const existing = (
    await payload.find({ collection: 'posts', where: { slug: { equals: blog.slug } }, draft: true, limit: 1, depth: 0 })
  ).docs[0]
  const data = {
    title: blog.title,
    slug: blog.slug,
    content: convertMarkdownToLexical({ editorConfig, markdown: blog.markdown }),
    meta: { title: blog.title, description: blog.excerpt },
    _status: 'published' as const,
    ...(firstAdmin ? { authors: [firstAdmin.id] } : {}),
  }
  const action = existing ? 'update' : 'create'
  console.log(`  ${action.padEnd(6)} /posts/${blog.slug}`)
  if (!apply) continue
  const saved = existing
    ? await payload.update({ collection: 'posts', id: existing.id, data, context: ctx })
    : await payload.create({ collection: 'posts', data: { ...data, publishedAt: new Date().toISOString() }, context: ctx })
  postIds.set(blog.slug, Number(saved.id))
}

// ---------- 3. Certifications ----------

console.log('\n== Certifications')
for (const spec of certSpecs) {
  const existing = (
    await payload.find({ collection: 'certifications', where: { slug: { equals: spec.slug } }, draft: true, limit: 1, depth: 0 })
  ).docs[0]
  const sameCode = existing
    ? undefined
    : (
        await payload.find({
          collection: 'certifications',
          where: { examCode: { equals: spec.examCode } },
          draft: true,
          limit: 1,
          depth: 0,
        })
      ).docs[0]
  if (sameCode) {
    throw new Error(
      `${spec.slug}: a certification with exam code ${spec.examCode} already exists as "${sameCode.slug}" - not creating a duplicate. Fix the slug in certification-details.md.`,
    )
  }

  console.log(`  ${existing ? 'update' : 'create'} ${spec.title} (/certifications/${spec.slug})`)
  const changes: Record<string, unknown> = {
    vendor: spec.vendor,
    examCode: spec.examCode,
    isSiteCode: spec.isSiteCode,
    certCategory: spec.certCategory,
    examStatus: spec.examStatus,
    passingScore: spec.passingScore,
    examQuestionCount: spec.examQuestionCount,
    durationMinutes: spec.durationMinutes,
    delivery: spec.delivery,
  }
  for (const [k, v] of Object.entries(changes)) {
    const before = existing?.[k as keyof typeof existing]
    if (String(before ?? '') !== String(v)) console.log(`      ${k}: ${before ?? '(empty)'} -> ${v}`)
  }
  console.log(`      domains: ${spec.domains.map((d) => `${d.name} ${d.weight}%`).join(', ')}`)
  console.log(`      published: ${existing?._status === 'published' ? 'already' : 'yes (will publish)'}`)
  if (!apply) continue

  const data = {
    ...changes,
    title: existing?.title || spec.title,
    slug: spec.slug,
    domains: spec.domains.map((d) => ({ name: d.name, weight: d.weight, studyGuide: postIds.get(d.guideSlug) })),
    _status: 'published' as const,
  }
  if (existing) {
    await payload.update({ collection: 'certifications', id: existing.id, data, context: ctx })
  } else {
    await payload.create({ collection: 'certifications', data, context: ctx })
  }
}

// ---------- 4. Questions ----------

console.log('\n== Questions')
for (const file of questionFiles) {
  const { header, rows } = rowsFromSheet((await readSheet(path.join(packDir, file))) as unknown[][])
  const headerProblem = checkQuestionHeader(header)
  if (headerProblem) throw new Error(`${file}: ${headerProblem}`)
  const hasWhy = header.includes('why_a')
  const results = apply ? await importQuestionRows(payload, rows) : await checkQuestionRows(payload, rows)
  const counts = results.reduce<Record<string, number>>((acc, r) => ((acc[r.status] = (acc[r.status] || 0) + 1), acc), {})
  console.log(`  ${file}: ${rows.length} rows${hasWhy ? ' (with why_a-why_d)' : ''} -> ${JSON.stringify(counts)}`)
  for (const r of results.filter((x) => x.problems.length)) {
    console.log(`      row ${r.row} [${r.status}] ${r.label?.slice(0, 70)}: ${r.problems.join('; ')}`)
  }
}

// ---------- 5. Extra certifications to publish ----------

if (publishSlugs.length) console.log('\n== Publish')
for (const slug of publishSlugs) {
  const doc = (await payload.find({ collection: 'certifications', where: { slug: { equals: slug } }, draft: true, limit: 1, depth: 0 })).docs[0]
  if (!doc) {
    console.log(`  ${slug}: not found`)
    continue
  }
  if (doc._status === 'published') {
    console.log(`  ${slug}: already published`)
    continue
  }
  console.log(`  publish ${doc.title}`)
  if (apply) await payload.update({ collection: 'certifications', id: doc.id, data: { _status: 'published' }, context: ctx })
}

// ---------- 6. Summary ----------

console.log('\n== Question counts')
for (const slug of [...certSpecs.map((c) => c.slug), ...publishSlugs]) {
  const cert = (await payload.find({ collection: 'certifications', where: { slug: { equals: slug } }, draft: true, limit: 1, depth: 0 })).docs[0]
  if (!cert) continue
  const total = await payload.count({ collection: 'questions', where: { certification: { equals: cert.id } } })
  console.log(`  ${slug}: ${total.totalDocs} questions, ${cert._status}`)
}
process.exit(0)
