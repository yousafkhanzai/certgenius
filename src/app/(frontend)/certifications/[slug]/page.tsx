import type { Metadata } from 'next'

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { draftMode } from 'next/headers'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import React, { cache } from 'react'

import RichText from '@/components/RichText'
import { Media } from '@/components/Media'

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
            <span className="text-xs uppercase tracking-wide rounded-full bg-muted px-3 py-1">
              {cert.vendor}
            </span>
          )}
          {cert.examCode && (
            <span className="text-xs uppercase tracking-wide rounded-full bg-muted px-3 py-1">
              {cert.examCode}
            </span>
          )}
          {cert.difficulty && (
            <span className="text-xs uppercase tracking-wide rounded-full bg-muted px-3 py-1">
              {cert.difficulty}
            </span>
          )}
        </div>

        <h1 className="mb-4">{cert.title}</h1>
        {cert.summary && <p className="text-lg text-muted-foreground mb-6">{cert.summary}</p>}

        <div className="flex flex-wrap gap-4 mb-10">
          <Link
            href={`/certifications/${cert.slug}/practice`}
            className="inline-flex items-center rounded-md bg-black text-white dark:bg-white dark:text-black px-5 py-3 font-medium no-underline"
          >
            Start Free Practice Test ({questionCount.totalDocs} question
            {questionCount.totalDocs === 1 ? '' : 's'})
          </Link>
          {cert.affiliateLink && (
            <a
              href={cert.affiliateLink}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="inline-flex items-center rounded-md border px-5 py-3 font-medium no-underline"
            >
              Official Training / Exam Info
            </a>
          )}
        </div>

        {(cert.passingScore || cert.durationMinutes) && (
          <div className="flex flex-wrap gap-8 mb-10 text-sm">
            {cert.passingScore && (
              <div>
                <div className="text-muted-foreground">Passing Score</div>
                <div className="font-semibold">{cert.passingScore}%</div>
              </div>
            )}
            {cert.durationMinutes && (
              <div>
                <div className="text-muted-foreground">Exam Duration</div>
                <div className="font-semibold">{cert.durationMinutes} minutes</div>
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
