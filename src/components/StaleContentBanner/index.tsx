// Shows a reminder banner at the top of the admin dashboard listing every
// published Blog Post, Page, and Certification that hasn't been updated in
// 3+ months. The clock is based on `updatedAt`, which Payload sets to the
// original publish date when a document is first published and resets
// automatically any time it's edited and saved again - so publishing starts
// the 3-month countdown, and reviewing/updating a document restarts it.
//
// This only shows up here in the admin dashboard - visitors to the live site
// never see it. Runs as a server component so it can query the database
// directly via the local API, the same way SeedButton/BeforeDashboard do.
import { Banner } from '@payloadcms/ui/elements/Banner'
import { getPayload } from 'payload'
import Link from 'next/link'
import React from 'react'

import config from '@payload-config'

const STALE_AFTER_DAYS = 90

type StaleTarget = {
  slug: 'posts' | 'pages' | 'certifications'
  label: string
}

const TARGETS: StaleTarget[] = [
  { slug: 'posts', label: 'Blog Post' },
  { slug: 'pages', label: 'Page' },
  { slug: 'certifications', label: 'Certification' },
]

type StaleItem = {
  id: number | string
  title: string
  collectionSlug: StaleTarget['slug']
  collectionLabel: string
  updatedAt: string
}

function daysAgo(dateStr: string): number {
  const ms = Date.now() - new Date(dateStr).getTime()
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)))
}

async function getStaleItems(): Promise<StaleItem[]> {
  const payload = await getPayload({ config })
  const cutoff = new Date(Date.now() - STALE_AFTER_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const results = await Promise.all(
    TARGETS.map((target) =>
      payload.find({
        collection: target.slug,
        where: {
          and: [{ _status: { equals: 'published' } }, { updatedAt: { less_than: cutoff } }],
        },
        sort: 'updatedAt',
        limit: 25,
        depth: 0,
        overrideAccess: true,
      }),
    ),
  )

  const items: StaleItem[] = []
  results.forEach((res, i) => {
    const target = TARGETS[i]
    res.docs.forEach((doc) => {
      const title = 'title' in doc && typeof doc.title === 'string' ? doc.title : '(untitled)'
      items.push({
        id: doc.id,
        title,
        collectionSlug: target.slug,
        collectionLabel: target.label,
        updatedAt: doc.updatedAt,
      })
    })
  })

  return items.sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime())
}

export default async function StaleContentBanner() {
  const items = await getStaleItems()

  if (items.length === 0) return null

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <Banner type="info">
        <strong>
          {items.length} item{items.length === 1 ? '' : 's'} due for a content refresh
        </strong>
        <p style={{ margin: '0.5rem 0' }}>
          Published or last updated more than 3 months ago. A quick review keeps them accurate and
          signals fresh content to search engines:
        </p>
        <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
          {items.map((item) => (
            <li key={`${item.collectionSlug}-${item.id}`}>
              <Link href={`/admin/collections/${item.collectionSlug}/${item.id}`}>
                {item.title}
              </Link>{' '}
              <span style={{ opacity: 0.7 }}>
                — {item.collectionLabel}, last updated {daysAgo(item.updatedAt)} days ago
              </span>
            </li>
          ))}
        </ul>
      </Banner>
    </div>
  )
}
