'use client'

// Small notice shown at the top of a single document's edit screen (Blog
// Posts, Pages, Certifications) when it was published or last updated more
// than 3 months ago. Pairs with StaleContentBanner, which lists all such
// documents together on the main admin dashboard - this is the same
// reminder, but right on the document itself so it's impossible to miss
// while you're already editing it.
import { Banner, useDocumentInfo } from '@payloadcms/ui'
import React from 'react'

const STALE_AFTER_DAYS = 90

function daysAgo(dateStr: string): number {
  const ms = Date.now() - new Date(dateStr).getTime()
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)))
}

export default function StaleDocumentNotice() {
  const { data } = useDocumentInfo()

  const status = typeof data?._status === 'string' ? data._status : undefined
  const updatedAt = typeof data?.updatedAt === 'string' ? data.updatedAt : undefined

  if (status !== 'published' || !updatedAt) return null

  const age = daysAgo(updatedAt)
  if (age < STALE_AFTER_DAYS) return null

  return (
    <div style={{ marginBottom: '1rem' }}>
      <Banner type="info">
        This was published {age} days ago. Consider reviewing and updating it, then save to reset
        the 3-month clock.
      </Banner>
    </div>
  )
}
