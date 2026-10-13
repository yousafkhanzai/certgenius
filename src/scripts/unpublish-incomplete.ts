/**
 * Unpublishes every PUBLISHED certification that does not meet the publishing
 * rule (domains, questions in every domain, a published blog for every domain).
 * Nothing is deleted: the certification becomes a draft and can be published
 * again from the admin once it is complete.
 *
 *   npx tsx src/scripts/unpublish-incomplete.ts --target=test            (preview)
 *   npx tsx src/scripts/unpublish-incomplete.ts --target=live --apply
 */
import 'dotenv/config'
import { readFileSync } from 'fs'

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')).map(([k, v]) => [k, v ?? 'true']))
const target = args.target
const apply = args.apply === 'true'
if (target !== 'test' && target !== 'live') {
  console.error('Use --target=test or --target=live')
  process.exit(1)
}
if (target === 'live') {
  const url = readFileSync('.env.live-db', 'utf8').match(/postgres(?:ql)?:\/\/[^\s'"]+/)?.[0]
  if (!url) throw new Error('.env.live-db does not contain a connection string')
  if (process.env.DATABASE_URL && new URL(url).host === new URL(process.env.DATABASE_URL).host) {
    throw new Error('.env.live-db points at the same database as .env - refusing')
  }
  process.env.DATABASE_URL = url
}
// Never restructure the database from this script.
;(process.env as Record<string, string>).NODE_ENV = 'production'
process.env.PAYLOAD_MIGRATING = 'true'

console.log(`Target: ${target.toUpperCase()} (${new URL(process.env.DATABASE_URL || '').host.replace(/^(ep-[a-z]+-[a-z]+).*/, '$1-***')})`)
console.log(apply ? 'Mode: APPLY\n' : 'Mode: PREVIEW (nothing will be saved)\n')

const { getPayload } = await import('payload')
const { default: config } = await import('../payload.config')
const { publishProblems } = await import('../collections/Certifications/publishRule')
const payload = await getPayload({ config })

const published = await payload.find({
  collection: 'certifications',
  where: { _status: { equals: 'published' } },
  depth: 0,
  limit: 0,
  pagination: false,
})
for (const cert of published.docs) {
  const problems = await publishProblems(payload, cert.id, cert.domains || [])
  if (!problems.length) {
    console.log(`KEEP       ${cert.title}`)
    continue
  }
  console.log(`UNPUBLISH  ${cert.title}\n           missing: ${problems.join('; ')}`)
  if (apply) {
    // A real unpublish: the saved document itself becomes a draft. (With
    // `draft: true` Payload would only add a draft version and leave the
    // published copy live.)
    await payload.update({ collection: 'certifications', id: cert.id, data: { _status: 'draft' } })
  }
}
const after = await payload.count({ collection: 'certifications', where: { _status: { equals: 'published' } } })
console.log(`\nPublished certifications now: ${after.totalDocs}`)
process.exit(0)
