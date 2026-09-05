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
import { getPayload } from 'payload'

import config from '../payload.config'

async function run() {
  console.log('Ensuring database schema is up to date...')
  await getPayload({ config })
  console.log('Database schema is ready.')
  process.exit(0)
}

run().catch((err) => {
  console.error('Failed to prepare database schema:', err)
  process.exit(1)
})
