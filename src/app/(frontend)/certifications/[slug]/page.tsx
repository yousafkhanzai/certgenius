import type { Metadata } from 'next'

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { draftMode } from 'next/headers'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import React, { cache } from 'react'

import RichText from '@/components/RichText'
import { Media } from '@/components/Media'
import { JsonLd } from '@/components/JsonLd'
import { breadcrumbSchema, courseSchema } from '@/utilities/schema'

export async function generateStaticParams() {
  const payload = await getPayload({ config: configPromise })
  const certifications = await payload.find({
    collection: 'certifications',
    draft: false,
    limit: 1000,
    overrideAccess: false,
    pagination: false,
    select: { slug: true },
  })

  return certifications.docs.map(({ slug }) => ({ slug }))
}

type Args = {
  params: Promise<{ slug?: string }>
}

export default async function CertificationPage({ params: paramsPromise }: Args) {
  const { slug = '' } = await paramsPromise
  const decodedSlug = decodeURIComponent(slug)
  const cert = await queryCertificationBySlug({ slug: decodedSlug })

  if (!cert) return notFound()

  const payload = await getPayload({ config: configPromise })
  const questionCount = await payload.count({
    collection: 'questions',
    where: { certification: { equals: cert.id } },
  })

  return (
    <article className="pt-16 pb-24">
      <JsonLd
        data={courseSchema({
          title: cert.title,
          slug: cert.slug || decodedSlug,
          summary: cert.summary,
          vendor: cert.vendor,
          examCode: cert.examCode,
        })}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Certifications', path: '/certifications' },
          { name: cert.title, path: `/certifications/${cert.slug}` },
        ])}
      />
      <div className="container mb-8 max-w-[52rem]">
        <div className="flex flex-wrap items-center gap-2 mb-4 text-sm text-muted-foreground">
          <Link href="/certifications" className="underline">
            Certifications
          </Link>
          <span>/</span>
          <span>{cert.title}</span>
        </div>

        {cert.heroImage && typeof cert.heroImage === 'object' && (
          <div className="mb-8 rounded-lg overflow-hidden">
            <Media resource={cert.heroImage} />
          </div>
        )}

        <div className="flex flex-wrap gap-2 mb-4">
          {cert.vendor && (
            <span className="text-xs font-bold uppercase tracking-wide rounded-full bg-accent text-accent-foreground px-3 py-1.5">
              {cert.vendor}
            </span>
          )}
          {cert.examCode && (
            <span className="text-xs font-bold uppercase tracking-wide rounded-full bg-accent text-accent-foreground px-3 py-1.5">
              {cert.examCode}
            </span>
          )}
          {cert.difficulty && (
            <span className="text-xs font-bold uppercase tracking-wide rounded-full bg-chart-5 text-[oklch(20%_0.05_70deg)] px-3 py-1.5">
              {cert.difficulty}
            </span>
          )}
        </div>

        <h1 className="mb-4">{cert.title}</h1>
        {cert.summary && <p className="text-lg text-muted-foreground mb-6">{cert.summary}</p>}

        <div className="flex flex-wrap gap-3 mb-10">
          <Link
            href={`/certifications/${cert.slug}/practice`}
            className="inline-flex items-center rounded-full bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 px-6 py-3 font-semibold no-underline"
          >
            Start Free Practice Test ({questionCount.totalDocs} question
            {questionCount.totalDocs === 1 ? '' : 's'})
          </Link>
          {cert.affiliateLink && (
            <a
              href={cert.affiliateLink}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="inline-flex items-center rounded-full border border-input bg-background shadow-xs hover:bg-accent px-6 py-3 font-semibold no-underline"
            >
              Official Training / Exam Info
            </a>
          )}
        </div>

        {(cert.passingScore || cert.durationMinutes) && (
          <div className="flex flex-wrap gap-8 mb-10 p-6 rounded-2xl bg-card border border-border text-sm">
            {cert.passingScore && (
              <div>
                <div className="text-muted-foreground">Passing Score</div>
                <div className="font-bold text-lg">{cert.passingScore}%</div>
              </div>
            )}
            {cert.durationMinutes && (
              <div>
                <div className="text-muted-foreground">Exam Duration</div>
                <div className="font-bold text-lg">{cert.durationMinutes} minutes</div>
              </div>
            )}
          </div>
        )}

        {cert.overview && <RichText data={cert.overview} enableGutter={false} />}
      </div>
    </article>
  )
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { slug = '' } = await paramsPromise
  const cert = await queryCertificationBySlug({ slug: decodeURIComponent(slug) })

  return {
    title: cert ? `${cert.title} Practice Test` : 'Certification',
    description: cert?.summary || undefined,
  }
}

const queryCertificationBySlug = cache(async ({ slug }: { slug: string }) => {
  const { isEnabled: draft } = await draftMode()
  const payload = await getPayload({ config: configPromise })

  const result = await payload.find({
    collection: 'certifications',
    depth: 2,
    draft,
    limit: 1,
    overrideAccess: draft,
    pagination: false,
    where: { slug: { equals: slug } },
  })

  return result.docs?.[0] || null
})
