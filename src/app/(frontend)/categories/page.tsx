import type { Metadata } from 'next'
import Link from 'next/link'
import React from 'react'

import { JsonLd } from '@/components/JsonLd'
import { PageHero } from '@/components/site/PageHero'
import { categoryHref, categoryIcon, publishedCategories } from '@/site/taxonomy'
import { getServerSideURL } from '@/utilities/getURL'
import { breadcrumbSchema, collectionPageSchema } from '@/utilities/schema'

export const revalidate = 600

const DESCRIPTION = 'Browse free IT certification practice exams by category.'

// Only categories that have a published certification are listed.
export default async function CategoriesPage() {
  const categories = await publishedCategories()

  return (
    <div className="pb-24">
      <JsonLd data={breadcrumbSchema([{ name: 'Home', path: '/' }, { name: 'Categories', path: '/categories' }])} />
      <JsonLd
        data={collectionPageSchema({
          name: 'Certification categories',
          description: DESCRIPTION,
          path: '/categories',
          items: categories.map((c) => ({ name: c.label, path: categoryHref(c.value) })),
        })}
      />
      <PageHero crumbs={[{ name: 'Home', href: '/' }, { name: 'Categories' }]} title="Browse by category" intro={DESCRIPTION} />
      <div className="mx-auto max-w-[1240px] px-4 pt-10 sm:px-6">
        {categories.length === 0 ? (
          <p className="text-muted-foreground">No certifications are published yet. Check back soon.</p>
        ) : (
          <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(100%,260px),1fr))]">
            {categories.map((c) => {
              const Icon = categoryIcon(c.value)
              return (
                <Link
                  key={c.value}
                  href={categoryHref(c.value)}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 text-card-foreground no-underline hover:border-primary hover:text-card-foreground"
                >
                  <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="text-[15px] font-bold leading-snug">{c.label}</span>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export function generateMetadata(): Metadata {
  return {
    title: 'Certification categories | CertGenius',
    description: DESCRIPTION,
    alternates: { canonical: `${getServerSideURL()}/categories` },
  }
}
