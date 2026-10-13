import type { Metadata } from 'next'

import Link from 'next/link'
import React from 'react'

import { HOME_FAQ } from '@/components/Home/faq'
import { JsonLd } from '@/components/JsonLd'
import { getServerSideURL } from '@/utilities/getURL'
import { breadcrumbSchema } from '@/utilities/schema'

// The site-wide FAQ page.
export default function FaqPage() {
  return (
    <div className="pb-24">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: HOME_FAQ.flatMap((g) => g.items).map((f) => ({
            '@type': 'Question',
            name: f.q,
            acceptedAnswer: { '@type': 'Answer', text: f.a },
          })),
        }}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'FAQ', path: '/faq' },
        ])}
      />
      <section className="bg-hero text-white">
        <div className="mx-auto flex max-w-[860px] flex-col gap-4 px-4 py-14 sm:px-6">
          <nav aria-label="Breadcrumb" className="flex gap-2 text-sm text-hero-muted">
            <Link href="/" className="text-hero-muted no-underline hover:text-white">
              Home
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-white">FAQ</span>
          </nav>
          <h1 className="m-0 text-[36px] font-extrabold leading-tight tracking-[-0.03em] sm:text-[48px]">Frequently asked questions</h1>
          <p className="m-0 text-lg leading-relaxed text-hero-body">
            How CertGenius works: practice, exam simulations, study guides and your progress.
          </p>
        </div>
      </section>

      <div className="mx-auto flex max-w-[860px] flex-col gap-12 px-4 pt-12 sm:px-6">
        {HOME_FAQ.map((group) => (
          <section key={group.group} className="flex flex-col gap-4">
            <h2 className="m-0 text-2xl font-extrabold tracking-[-0.02em]">{group.group}</h2>
            <div className="flex flex-col gap-3">
              {group.items.map((item) => (
                <details key={item.q} className="group rounded-2xl border border-border bg-card px-5 py-4">
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-3 text-base font-semibold [&::-webkit-details-marker]:hidden">
                    {item.q}
                    <span className="flex-none text-muted-foreground transition-transform group-open:rotate-45" aria-hidden="true">
                      +
                    </span>
                  </summary>
                  <p className="m-0 mt-3 leading-relaxed text-muted-foreground">{item.a}</p>
                </details>
              ))}
            </div>
          </section>
        ))}

        <section className="flex flex-wrap items-center justify-between gap-5 rounded-[24px] bg-hero p-8 text-white">
          <div className="flex flex-col gap-1.5">
            <h2 className="m-0 text-2xl font-extrabold tracking-[-0.02em]">Ready to start?</h2>
            <p className="m-0 text-hero-body">Pick a certification and try 10 questions free. No account needed.</p>
          </div>
          <Link
            href="/certifications"
            className="flex h-12 items-center rounded-xl bg-mint px-6 font-bold text-mint-foreground no-underline hover:text-mint-foreground hover:brightness-95"
          >
            Browse certifications
          </Link>
        </section>
      </div>
    </div>
  )
}

export function generateMetadata(): Metadata {
  const title = 'Frequently asked questions | CertGenius'
  const description =
    'Answers about CertGenius: free practice questions, exam simulations, study guides, accounts, readiness and mastery.'
  return { title, description, alternates: { canonical: `${getServerSideURL()}/faq` } }
}
