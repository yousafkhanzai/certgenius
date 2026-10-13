/**
 * RECOVERY: turns the admin pattern lock OFF (for when the pattern has been
 * forgotten). Only the saved pattern and the wrong-try counters are removed;
 * no content or accounts are touched. Afterwards log in with the password
 * and set a new pattern under Admin > Admin security.
 *
 *   npx tsx src/scripts/reset-admin-gate.ts --target=test            (preview)
 *   npx tsx src/scripts/reset-admin-gate.ts --target=live --apply
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
const payload = await getPayload({ config })

const keys = await payload.kv.keys()
const gateKeys = keys.filter((key) => key.startsWith('admin-gate:'))
console.log(gateKeys.includes('admin-gate:config') ? 'Pattern lock is ON.' : 'Pattern lock is already OFF.')
if (apply) {
  for (const key of gateKeys) await payload.kv.delete(key)
  console.log('Pattern lock turned OFF. Log in and set a new pattern under Admin > Admin security.')
}
process.exit(0)
