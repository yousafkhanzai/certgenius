import type { Metadata } from 'next/types'

import Link from 'next/link'
import React, { Suspense } from 'react'

import { CERT_CATEGORIES } from '@/collections/Certifications/options'
import { CertCardView } from '@/components/Home/CertCardView'
import { JsonLd } from '@/components/JsonLd'
import { CertBrowser } from '@/components/site/CertBrowser'
import { listedCertifications } from '@/site/data'
import { getServerSideURL } from '@/utilities/getURL'
import { breadcrumbSchema } from '@/utilities/schema'

export const revalidate = 600

// All published certifications, with search and filters. Draft, Retired and
// On hold certifications never appear here.
export default async function CertificationsPage() {
  const certs = (await listedCertifications()).filter((c) => c.questions > 0).sort((a, b) => a.title.localeCompare(b.title))
  // Only categories and vendors that have a published certification.
  const categories = CERT_CATEGORIES.filter((cat) => certs.some((c) => c.category === cat.value)).map((c) => ({
    value: c.value,
    label: c.label,
  }))
  const vendors = Array.from(new Set(certs.map((c) => c.vendor).filter((v): v is string => Boolean(v)))).sort()

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
            Free practice questions, exam simulations and study guides. Search by name or vendor, or filter by category.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-[1240px] px-4 pt-10 sm:px-6">
        {certs.length === 0 ? (
          <p className="text-muted-foreground">No certifications are published yet. Check back soon.</p>
        ) : (
          // The search reads the page address, so it loads in the browser; the
          // plain list below is what search engines and no-JavaScript visitors get.
          <Suspense
            fallback={
              <div className="grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(min(100%,340px),1fr))]">
                {certs.map((c) => (
                  <CertCardView key={c.id} cert={c} />
                ))}
              </div>
            }
          >
            <CertBrowser certs={certs} categories={categories} vendors={vendors} />
          </Suspense>
        )}
      </div>
    </div>
  )
}

export function generateMetadata(): Metadata {
  const title = 'IT certification practice exams | CertGenius'
  const description = 'Free practice questions, exam simulations and study guides for IT certifications. Search by name or vendor.'
  return {
    title,
    description,
    alternates: { canonical: `${getServerSideURL()}/certifications` },
  }
}
