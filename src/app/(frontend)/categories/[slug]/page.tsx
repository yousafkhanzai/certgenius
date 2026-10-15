import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import React, { cache } from 'react'

import { CertCardView } from '@/components/Home/CertCardView'
import { JsonLd } from '@/components/JsonLd'
import { PageHero, cardGrid } from '@/components/site/PageHero'
import { categoryHref, publishedCategories } from '@/site/taxonomy'
import { getServerSideURL } from '@/utilities/getURL'
import { breadcrumbSchema, collectionPageSchema } from '@/utilities/schema'

// Rebuilt every 10 minutes: a category page appears by itself when its first
// certification is published, and is gone again if none are left.
export const revalidate = 600

type Args = { params: Promise<{ slug: string }> }

const findCategory = cache(async (slug: string) => (await publishedCategories()).find((c) => c.value === slug) || null)

export async function generateStaticParams() {
  return (await publishedCategories()).map((c) => ({ slug: c.value }))
}

const describe = (label: string) =>
  `Free ${label} certification practice exams, with every answer explained and a study guide for every domain.`

export default async function CategoryPage({ params }: Args) {
  const { slug } = await params
  const category = await findCategory(slug)
  if (!category) notFound()

  const path = categoryHref(category.value)
  return (
    <div className="pb-24">
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Categories', path: '/categories' },
          { name: category.label, path },
        ])}
      />
      <JsonLd
        data={collectionPageSchema({
          name: `${category.label} certifications`,
          description: describe(category.label),
          path,
          items: category.certs.map((c) => ({ name: c.title, path: `/certifications/${c.slug}` })),
        })}
      />
      <PageHero
        crumbs={[{ name: 'Home', href: '/' }, { name: 'Categories', href: '/categories' }, { name: category.label }]}
        title={`${category.label} certifications`}
        intro={describe(category.label)}
      />
      <div className="mx-auto max-w-[1240px] px-4 pt-10 sm:px-6">
        <div className={cardGrid}>
          {category.certs.map((c) => (
            <CertCardView key={c.id} cert={c} />
          ))}
        </div>
        {/* Ad slot: reserved for Phase 6 (AdSense with cookie consent). Nothing is rendered until then. */}
      </div>
    </div>
  )
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { slug } = await params
  const category = await findCategory(slug)
  if (!category) return { title: 'Category not found | CertGenius', robots: { index: false } }
  return {
    title: `${category.label} certification practice exams | CertGenius`,
    description: describe(category.label),
    alternates: { canonical: `${getServerSideURL()}${categoryHref(category.value)}` },
  }
}
