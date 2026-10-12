import type { Metadata } from 'next/types'

import Link from 'next/link'
import React from 'react'

import { CERT_CATEGORIES } from '@/collections/Certifications/options'
import { JsonLd } from '@/components/JsonLd'
import { CertCardView } from '@/components/Home/CertCardView'
import { listedCertifications } from '@/site/data'
import { getServerSideURL } from '@/utilities/getURL'
import { breadcrumbSchema } from '@/utilities/schema'

export const revalidate = 600

const vendorId = (name: string) => `vendor-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`

// All published certifications, grouped by category and by vendor. Draft,
// Retired and On hold certifications never appear here.
export default async function CertificationsPage() {
  const certs = (await listedCertifications()).filter((c) => c.questions > 0)
  const byCategory = CERT_CATEGORIES.map((cat) => ({ ...cat, certs: certs.filter((c) => c.category === cat.value) })).filter(
    (g) => g.certs.length > 0,
  )
  const uncategorised = certs.filter((c) => !c.category)
  const vendors = Array.from(new Set(certs.map((c) => c.vendor).filter((v): v is string => Boolean(v)))).sort()

  const grid = 'grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(min(100%,340px),1fr))]'
  const h2 = 'm-0 text-2xl font-extrabold tracking-[-0.02em]'

  return (
    <div className="pb-24">
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Certifications', path: '/certifications' },
        ])}
      />
      <section className="bg-hero text-white">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-4 px-4 py-14 sm:px-6">
          <nav aria-label="Breadcrumb" className="flex gap-2 text-sm text-hero-muted">
            <Link href="/" className="text-hero-muted no-underline hover:text-white">
              Home
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-white">Certifications</span>
          </nav>
          <h1 className="m-0 text-[36px] font-extrabold leading-tight tracking-[-0.03em] sm:text-[48px]">Certification practice exams</h1>
          <p className="m-0 max-w-[640px] text-lg leading-relaxed text-hero-body">
            {certs.length} certification{certs.length === 1 ? '' : 's'} with free practice questions, exam simulations and study
            guides. Pick one to get started.
          </p>
          {byCategory.length > 1 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {byCategory.map((g) => (
                <a
                  key={g.value}
                  href={`#${g.value}`}
                  className="rounded-full border border-hero-border bg-hero-raised px-3.5 py-1.5 text-sm font-semibold text-white no-underline hover:text-mint"
                >
                  {g.label} ({g.certs.length})
                </a>
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="mx-auto flex max-w-[1240px] flex-col gap-14 px-4 pt-12 sm:px-6">
        {certs.length === 0 && <p className="text-muted-foreground">No certifications are published yet. Check back soon.</p>}

        {byCategory.map((g) => (
          <section key={g.value} id={g.value} className="flex scroll-mt-24 flex-col gap-5">
            <h2 className={h2}>{g.label}</h2>
            <div className={grid}>
              {g.certs.map((c) => (
                <CertCardView key={c.id} cert={c} />
              ))}
            </div>
          </section>
        ))}

        {uncategorised.length > 0 && (
          <section className="flex flex-col gap-5">
            <h2 className={h2}>{byCategory.length ? 'More certifications' : 'All certifications'}</h2>
            <div className={grid}>
              {uncategorised.map((c) => (
                <CertCardView key={c.id} cert={c} />
              ))}
            </div>
          </section>
        )}

        {vendors.length > 0 && (
          <section className="flex flex-col gap-8 border-t border-border pt-12">
            <h2 className={h2}>Browse by vendor</h2>
            {vendors.map((v) => (
              <div key={v} id={vendorId(v)} className="flex scroll-mt-24 flex-col gap-4">
                <h3 className="m-0 text-lg font-bold">{v}</h3>
                <div className={grid}>
                  {certs
                    .filter((c) => c.vendor === v)
                    .map((c) => (
                      <CertCardView key={c.id} cert={c} />
                    ))}
                </div>
              </div>
            ))}
          </section>
        )}
      </div>
    </div>
  )
}

export function generateMetadata(): Metadata {
  const title = 'IT certification practice exams | CertGenius'
  const description = 'Free practice questions, exam simulations and study guides for IT certifications, grouped by category and vendor.'
  return {
    title,
    description,
    alternates: { canonical: `${getServerSideURL()}/certifications` },
  }
}
