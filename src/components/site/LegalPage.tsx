import type { Metadata } from 'next'
import Link from 'next/link'
import React from 'react'

import { JsonLd } from '@/components/JsonLd'
import { getServerSideURL } from '@/utilities/getURL'
import { breadcrumbSchema } from '@/utilities/schema'
import { PageHero } from './PageHero'

// Shared layout for the legal pages (privacy, terms, affiliate disclosure,
// cookies). The words live in each page; edit them there.

// The address people can write to about privacy or the terms. Set
// NEXT_PUBLIC_CONTACT_EMAIL in Vercel to show it on every legal page.
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || null

export const LEGAL_PAGES = [
  { path: '/privacy', name: 'Privacy policy' },
  { path: '/terms', name: 'Terms of use' },
  { path: '/affiliate-disclosure', name: 'Affiliate disclosure' },
  { path: '/cookie-policy', name: 'Cookie policy' },
] as const

export function legalMetadata(path: string, title: string, description: string): Metadata {
  return {
    title: `${title} | CertGenius`,
    description,
    alternates: { canonical: `${getServerSideURL()}${path}` },
  }
}

export function Contact() {
  return CONTACT_EMAIL ? (
    <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
  ) : (
    <>the contact address that will be listed on this page</>
  )
}

export function LegalPage({
  path,
  title,
  updated,
  intro,
  children,
}: {
  path: string
  title: string
  updated: string
  intro: string
  children: React.ReactNode
}) {
  return (
    <div className="pb-24">
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: title, path },
        ])}
      />
      <PageHero crumbs={[{ name: 'Home', href: '/' }, { name: title }]} title={title} intro={intro}>
        <span className="text-sm text-hero-muted">Last updated {updated}</span>
      </PageHero>
      <div className="mx-auto grid max-w-[1240px] grid-cols-[minmax(0,1fr)] gap-10 px-4 pt-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_240px]">
        <div className="legal-text max-w-[760px] text-[17px] leading-[1.7] text-body [&_a]:font-semibold [&_a]:text-primary [&_h2]:mb-3 [&_h2]:mt-10 [&_h2]:text-2xl [&_h2]:font-extrabold [&_h2]:tracking-[-0.02em] [&_h2]:text-foreground [&_li]:mb-2 [&_p]:mb-4 [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-6">
          {children}
        </div>
        <nav aria-label="Legal pages" className="flex h-fit flex-col gap-2 rounded-2xl border border-border bg-card p-5 text-sm">
          <span className="text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground">Legal</span>
          {LEGAL_PAGES.map((p) =>
            p.path === path ? (
              <span key={p.path} className="font-bold text-foreground" aria-current="page">
                {p.name}
              </span>
            ) : (
              <Link key={p.path} href={p.path} className="text-primary no-underline hover:text-primary-hover">
                {p.name}
              </Link>
            ),
          )}
        </nav>
      </div>
    </div>
  )
}
