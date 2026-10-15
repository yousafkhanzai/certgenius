import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import React, { cache } from 'react'

import { CertCardView } from '@/components/Home/CertCardView'
import { JsonLd } from '@/components/JsonLd'
import { PageHero, cardGrid } from '@/components/site/PageHero'
import { publishedVendors } from '@/site/taxonomy'
import { getServerSideURL } from '@/utilities/getURL'
import { breadcrumbSchema, collectionPageSchema } from '@/utilities/schema'

// Rebuilt every 10 minutes; only vendors with a published certification exist.
export const revalidate = 600

type Args = { params: Promise<{ slug: string }> }

const findVendor = cache(async (slug: string) => (await publishedVendors()).find((v) => v.slug === slug) || null)

export async function generateStaticParams() {
  return (await publishedVendors()).map((v) => ({ slug: v.slug }))
}

const describe = (name: string) =>
  `Free ${name} certification practice exams, with every answer explained and a study guide for every domain.`

export default async function VendorPage({ params }: Args) {
  const { slug } = await params
  const vendor = await findVendor(slug)
  if (!vendor) notFound()

  const path = `/vendors/${vendor.slug}`
  return (
    <div className="pb-24">
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Vendors', path: '/vendors' },
          { name: vendor.name, path },
        ])}
      />
      <JsonLd
        data={collectionPageSchema({
          name: `${vendor.name} certifications`,
          description: describe(vendor.name),
          path,
          items: vendor.certs.map((c) => ({ name: c.title, path: `/certifications/${c.slug}` })),
        })}
      />
      <PageHero
        crumbs={[{ name: 'Home', href: '/' }, { name: 'Vendors', href: '/vendors' }, { name: vendor.name }]}
        title={`${vendor.name} certifications`}
        intro={describe(vendor.name)}
      />
      <div className="mx-auto max-w-[1240px] px-4 pt-10 sm:px-6">
        <div className={cardGrid}>
          {vendor.certs.map((c) => (
            <CertCardView key={c.id} cert={c} />
          ))}
        </div>
        <p className="mt-10 max-w-[720px] text-sm leading-relaxed text-muted-foreground">
          CertGenius is an independent study resource and is not affiliated with, endorsed by or sponsored by {vendor.name}.
          Vendor and exam names are trademarks of their respective owners.
        </p>
        {/* Ad slot: reserved for Phase 6 (AdSense with cookie consent). Nothing is rendered until then. */}
      </div>
    </div>
  )
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { slug } = await params
  const vendor = await findVendor(slug)
  if (!vendor) return { title: 'Vendor not found | CertGenius', robots: { index: false } }
  return {
    title: `${vendor.name} certification practice exams | CertGenius`,
    description: describe(vendor.name),
    alternates: { canonical: `${getServerSideURL()}/vendors/${vendor.slug}` },
  }
}
