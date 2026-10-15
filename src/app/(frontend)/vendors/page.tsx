import type { Metadata } from 'next'
import Link from 'next/link'
import React from 'react'

import { JsonLd } from '@/components/JsonLd'
import { PageHero } from '@/components/site/PageHero'
import { publishedVendors } from '@/site/taxonomy'
import { getServerSideURL } from '@/utilities/getURL'
import { breadcrumbSchema, collectionPageSchema } from '@/utilities/schema'

export const revalidate = 600

const DESCRIPTION = 'Browse free IT certification practice exams by vendor.'

// HARD RULE: vendor lists show names only (no counts).
export default async function VendorsPage() {
  const vendors = await publishedVendors()

  return (
    <div className="pb-24">
      <JsonLd data={breadcrumbSchema([{ name: 'Home', path: '/' }, { name: 'Vendors', path: '/vendors' }])} />
      <JsonLd
        data={collectionPageSchema({
          name: 'Certification vendors',
          description: DESCRIPTION,
          path: '/vendors',
          items: vendors.map((v) => ({ name: v.name, path: `/vendors/${v.slug}` })),
        })}
      />
      <PageHero crumbs={[{ name: 'Home', href: '/' }, { name: 'Vendors' }]} title="Browse by vendor" intro={DESCRIPTION} />
      <div className="mx-auto max-w-[1240px] px-4 pt-10 sm:px-6">
        {vendors.length === 0 ? (
          <p className="text-muted-foreground">No certifications are published yet. Check back soon.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {vendors.map((v) => (
              <Link
                key={v.slug}
                href={`/vendors/${v.slug}`}
                className="rounded-2xl border border-border bg-card px-5 py-3.5 text-base font-bold text-card-foreground no-underline hover:border-primary hover:text-primary"
              >
                {v.name}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function generateMetadata(): Metadata {
  return {
    title: 'Certification vendors | CertGenius',
    description: DESCRIPTION,
    alternates: { canonical: `${getServerSideURL()}/vendors` },
  }
}
