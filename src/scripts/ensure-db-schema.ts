// Runs once, before `next build`, so the database tables exist BEFORE any
// page tries to query them. Without this, Next.js builds several pages in
// parallel/sequence, each independently initializing Payload - and the very
// first query from any of them can run before Payload's schema-push has
// finished creating tables like "pages" or "certifications", causing
// intermittent "relation does not exist" build failures.
//
// Running it here, in its own process that we wait for in full before
// `next build` even starts, makes table creation happen once, deterministically,
// against the real database - so every page's queries always find the tables
// already there.
// Payload's built-in adapter only auto-creates tables when NODE_ENV is not
// "production" (it expects a real migrations setup in production instead).
// Vercel always builds with NODE_ENV=production, so without this override
// table-creation was being silently skipped entirely - even though this
// script reported success, because it never actually got to run.
// This only affects this one short-lived script; the actual `next build`
// that runs right after this still builds in real production mode.
;(process.env as Record<string, string>).NODE_ENV = 'development'

import { getPayload } from 'payload'

import config from '../payload.config'
import { seedContent } from '../seed/run'

async function run() {
  console.log('Ensuring database schema is up to date...')
  const payload = await getPayload({ config })
  console.log('Database schema is ready.')

  // Publish/update launch content on every build. This is safe to run
  // repeatedly - it looks up each certification, question, and page by its
  // slug/text first and only creates what's missing, so it never duplicates
  // or overwrites anything already published from the admin dashboard.
  console.log('Publishing launch content...')
  await seedContent(payload)
  console.log('Launch content is ready.')

  process.exit(0)
}

run().catch((err) => {
  console.error('Failed to prepare database schema:', err)
  process.exit(1)
})
