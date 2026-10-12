import Link from 'next/link'
import React from 'react'

import type { CertCard } from '@/site/data'

// Certification card used on the homepage and listings: code, vendor,
// questions, domains, minutes and pass score. No prices anywhere.
export function CertCardView({ cert }: { cert: CertCard }) {
  const facts = [
    { label: 'Questions', value: cert.questions },
    { label: 'Domains', value: cert.domains || '--' },
    { label: 'Minutes', value: cert.minutes ?? '--' },
    { label: 'Pass', value: cert.passScore ? `${cert.passScore}%` : '--' },
  ]
  return (
    <Link
      href={`/certifications/${cert.slug}`}
      className="group flex flex-col gap-4 rounded-[20px] border border-border bg-card p-6 text-card-foreground no-underline shadow-[0_1px_2px_rgba(16,24,40,0.05)] transition-colors hover:border-primary hover:text-card-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <span className="flex flex-wrap items-center gap-2">
        {cert.examCode && (
          <span
            className="rounded-md bg-[#0B1220] px-2 py-1 font-mono text-xs font-semibold text-white dark:bg-white dark:text-[#0B1220]"
            title={cert.isSiteCode ? 'CertGenius code (the vendor has no official exam code)' : undefined}
          >
            {cert.examCode}
          </span>
        )}
        {cert.vendor && <span className="text-[13px] font-medium text-muted-foreground">{cert.vendor}</span>}
        {cert.status === 'new' || cert.status === 'updated' ? (
          <span className="ml-auto rounded-full bg-secondary px-2.5 py-1 text-xs font-bold text-secondary-foreground">
            {cert.status === 'new' ? 'New' : 'Updated'}
          </span>
        ) : null}
      </span>
      <span className="text-lg font-bold leading-snug tracking-[-0.01em] group-hover:text-primary">{cert.title}</span>
      <span className="mt-auto grid grid-cols-4 gap-2 border-t border-border pt-4">
        {facts.map((f) => (
          <span key={f.label} className="flex flex-col">
            <span className="text-base font-bold">{f.value}</span>
            <span className="text-xs text-muted-foreground">{f.label}</span>
          </span>
        ))}
      </span>
    </Link>
  )
}

export function ComingSoonCard({ cert }: { cert: CertCard }) {
  return (
    <div className="flex flex-col gap-3 rounded-[20px] border-2 border-dashed border-border p-6">
      <span className="flex flex-wrap items-center gap-2">
        {cert.examCode && <span className="rounded-md bg-muted px-2 py-1 font-mono text-xs font-semibold">{cert.examCode}</span>}
        {cert.vendor && <span className="text-[13px] font-medium text-muted-foreground">{cert.vendor}</span>}
      </span>
      <span className="text-lg font-bold leading-snug">{cert.title}</span>
      <span className="mt-auto w-fit rounded-full bg-secondary px-2.5 py-1 text-xs font-bold text-secondary-foreground">Coming soon</span>
    </div>
  )
}
