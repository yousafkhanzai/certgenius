import Link from 'next/link'
import React from 'react'

import type { CertCard } from '@/site/data'

// Certification card used on the homepage and listings. HARD RULE: it shows
// the vendor, the name and the short description only - no exam code,
// question count, domains, time or pass score.
export function CertCardView({ cert, className = '' }: { cert: CertCard; className?: string }) {
  return (
    <Link
      href={`/certifications/${cert.slug}`}
      className={`group flex flex-col gap-3 rounded-[20px] border border-border bg-card p-6 text-card-foreground no-underline shadow-[0_1px_2px_rgba(16,24,40,0.05)] transition-colors hover:border-primary hover:text-card-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${className}`}
    >
      <span className="flex flex-wrap items-center gap-2">
        {cert.vendor && <span className="text-[13px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">{cert.vendor}</span>}
        {cert.status === 'new' || cert.status === 'updated' ? (
          <span className="ml-auto rounded-full bg-secondary px-2.5 py-1 text-xs font-bold text-secondary-foreground">
            {cert.status === 'new' ? 'New' : 'Updated'}
          </span>
        ) : null}
      </span>
      <span className="text-lg font-bold leading-snug tracking-[-0.01em] group-hover:text-primary">{cert.title}</span>
      {cert.summary && <span className="line-clamp-3 text-[15px] leading-relaxed text-muted-foreground">{cert.summary}</span>}
      <span className="mt-auto pt-1 text-sm font-semibold text-primary">Start practising</span>
    </Link>
  )
}

export function ComingSoonCard({ cert }: { cert: CertCard }) {
  return (
    <div className="flex flex-col gap-3 rounded-[20px] border-2 border-dashed border-border p-6">
      {cert.vendor && <span className="text-[13px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">{cert.vendor}</span>}
      <span className="text-lg font-bold leading-snug">{cert.title}</span>
      <span className="mt-auto w-fit rounded-full bg-secondary px-2.5 py-1 text-xs font-bold text-secondary-foreground">Coming soon</span>
    </div>
  )
}
