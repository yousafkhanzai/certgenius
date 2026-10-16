import type { Payload, PayloadRequest } from 'payload'

import type { ImportRow, RowResult } from './columns'

// Domains import: one row per domain - certification_slug, domain_name,
// weight, blog_post_url. Domains are MERGED into the certification:
//   - a domain with the same name gets the new weight (and blog, if given);
//   - a new name is added;
//   - domains already on the certification but not in the sheet are kept.
// The blog link is attached straight away when that blog already exists.
// Otherwise the blog attaches itself when it is imported later (its header
// names the certification and domain).

const MAX_NAME = 200

type Checked = RowResult & {
  certSlug?: string
  domain?: { name: string; weight: number | null; blogSlug: string | null }
}

// "https://site/posts/solidity-basics", "/blog/solidity-basics/" or
// "solidity-basics" -> "solidity-basics".
export function blogSlugFrom(link: string): string | null {
  const text = link.trim()
  if (!text) return null
  let path = text
  try {
    path = new URL(text).pathname
  } catch {
    // not a full link - a path or a bare slug
  }
  const parts = path.split('/').filter(Boolean)
  const slug = parts.length >= 2 && ['posts', 'blog'].includes(parts[0]) ? parts[1] : parts.length === 1 ? parts[0] : null
  return slug && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ? slug : null
}

// `pending` = certification slugs that are in the same upload and will be
// created just before the domains are saved.
export async function checkDomainRows(payload: Payload, rows: ImportRow[], pending: string[] = []): Promise<Checked[]> {
  const slugs = Array.from(new Set(rows.map((r) => r.values.certification_slug).filter(Boolean)))
  const found = await payload.find({
    collection: 'certifications',
    where: { slug: { in: slugs } },
    draft: true,
    depth: 0,
    limit: 0,
    pagination: false,
    overrideAccess: true,
    select: { slug: true },
  })
  const known = new Set([...found.docs.map((d) => d.slug as string), ...pending])

  const seen = new Set<string>()
  const results: Checked[] = rows.map(({ row, values: v }) => {
    const problems: string[] = []
    const name = (v.domain_name || '').trim()
    if (!v.certification_slug) problems.push('certification_slug is empty')
    else if (!known.has(v.certification_slug)) problems.push(`unknown certification "${v.certification_slug}" - import the certification first`)
    if (!name) problems.push('domain_name is empty')
    else if (name.length > MAX_NAME) problems.push(`domain_name is longer than ${MAX_NAME} characters`)

    let weight: number | null = null
    if (v.weight) {
      const n = Number(v.weight.replace('%', '').trim())
      if (!Number.isFinite(n) || n < 0 || n > 100) problems.push(`weight must be a number from 0 to 100 (got "${v.weight}")`)
      else weight = n
    }
    const blogSlug = v.blog_post_url ? blogSlugFrom(v.blog_post_url) : null
    if (v.blog_post_url && !blogSlug) {
      problems.push('blog_post_url must look like https://certgenius.vercel.app/posts/your-blog-slug (or just your-blog-slug)')
    }

    const label = `${v.certification_slug || '?'}: ${name || '?'}`
    if (problems.length) return { row, status: 'invalid', problems, label }
    const key = `${v.certification_slug}|${name}`
    if (seen.has(key)) return { row, status: 'duplicate', problems: ['this domain appears earlier in this file'], label }
    seen.add(key)
    return { row, status: 'valid', problems: [], label, key, certSlug: v.certification_slug, domain: { name, weight, blogSlug } }
  })

  return results
}

export async function importDomainRows(req: PayloadRequest, rows: ImportRow[], pending: string[] = []): Promise<RowResult[]> {
  const { payload } = req
  const checked = await checkDomainRows(payload, rows, pending)
  const valid = checked.filter((r) => r.status === 'valid' && r.certSlug && r.domain)

  // Blogs named in the sheet that already exist.
  const blogSlugs = Array.from(new Set(valid.map((r) => r.domain?.blogSlug).filter((s): s is string => Boolean(s))))
  const posts = blogSlugs.length
    ? await payload.find({
        collection: 'posts',
        where: { slug: { in: blogSlugs } },
        draft: true,
        depth: 0,
        limit: 0,
        pagination: false,
        overrideAccess: true,
        select: { slug: true },
      })
    : { docs: [] }
  const postBySlug = new Map(posts.docs.map((p) => [p.slug as string, Number(p.id)]))

  const byCert = new Map<string, Checked[]>()
  for (const r of valid) byCert.set(r.certSlug as string, [...(byCert.get(r.certSlug as string) || []), r])

  for (const [slug, items] of byCert) {
    try {
      const found = await payload.find({
        collection: 'certifications',
        where: { slug: { equals: slug } },
        draft: true,
        depth: 0,
        limit: 1,
        overrideAccess: true,
      })
      const cert = found.docs[0]
      if (!cert) throw new Error(`certification "${slug}" not found`)

      const domains = (cert.domains || []).map((d) => ({
        id: d.id,
        name: d.name,
        weight: d.weight ?? null,
        studyGuide: typeof d.studyGuide === 'object' ? (d.studyGuide?.id ?? null) : (d.studyGuide ?? null),
      }))
      const inSheet = new Set(items.map((r) => r.domain?.name))
      for (const r of items) {
        const d = r.domain as NonNullable<Checked['domain']>
        const postId = d.blogSlug ? postBySlug.get(d.blogSlug) : undefined
        const existing = domains.find((x) => x.name === d.name)
        if (existing) {
          if (d.weight !== null) existing.weight = d.weight
          if (postId) existing.studyGuide = postId
          r.status = 'updated'
        } else {
          domains.push({ id: undefined as unknown as string, name: d.name, weight: d.weight, studyGuide: postId ?? null })
          r.status = 'imported'
        }
        if (d.blogSlug) {
          r.problems.push(
            postId
              ? `blog "${d.blogSlug}" attached`
              : `blog "${d.blogSlug}" does not exist yet - it attaches itself when you import it (its header must name this certification and domain)`,
          )
        }
      }
      const kept = domains.filter((d) => !inSheet.has(d.name)).map((d) => `"${d.name}"`)
      if (kept.length) items[0].problems.push(`kept domain(s) not in this sheet: ${kept.join(', ')}`)
      // All the certification's domain weights together should make 100% (a tip, not an error).
      const weightSum = domains.reduce((sum, d) => sum + (d.weight || 0), 0)
      if (domains.some((d) => d.weight !== null) && Math.round(weightSum) !== 100) {
        items[0].problems.push(`note: this certification's domain weights now add up to ${weightSum}%, not 100%`)
      }

      await payload.update({
        collection: 'certifications',
        id: cert.id,
        data: { domains: domains.map(({ id, ...d }) => (id ? { id, ...d } : d)) },
        // A live certification keeps showing its current domains; the change
        // waits as a draft until it is published again (Certification health).
        draft: true,
        overrideAccess: true,
        req,
      })
      if (cert._status === 'published') {
        items[0].problems.push('this certification is live: the domain changes are saved as a draft - publish them from Certification health')
      }
    } catch (err) {
      for (const r of items) {
        r.status = 'invalid'
        r.problems.push(err instanceof Error ? err.message : 'could not be saved')
      }
    }
  }
  return checked.map(({ certSlug: _s, domain: _d, ...rest }) => rest)
}
