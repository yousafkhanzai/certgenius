import type { Metadata } from 'next'

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import React from 'react'

import { PracticeTest } from '@/components/PracticeTest'

export const dynamic = 'force-dynamic'

type Args = {
  params: Promise<{ slug?: string }>
}

export default async function PracticeTestPage({ params: paramsPromise }: Args) {
  const { slug = '' } = await paramsPromise
  const decodedSlug = decodeURIComponent(slug)
  const payload = await getPayload({ config: configPromise })

  const certResult = await payload.find({
    collection: 'certifications',
    limit: 1,
    overrideAccess: false,
    where: { slug: { equals: decodedSlug } },
  })

  const cert = certResult.docs?.[0]
  if (!cert) return notFound()

  const questionsResult = await payload.find({
    collection: 'questions',
    depth: 0,
    limit: 200,
    overrideAccess: false,
    where: { certification: { equals: cert.id } },
  })

  const questions = questionsResult.docs.map((q) => ({
    id: String(q.id),
    questionText: q.questionText,
    explanation: q.explanation || undefined,
    options: (q.options || []).map((o) => ({ text: o.text, isCorrect: Boolean(o.isCorrect) })),
  }))

  return (
    <div className="pt-16 pb-24">
      <div className="container max-w-[46rem]">
        <div className="flex flex-wrap items-center gap-2 mb-6 text-sm text-muted-foreground">
          <Link href="/certifications" className="underline">
            Certifications
          </Link>
          <span>/</span>
          <Link href={`/certifications/${cert.slug}`} className="underline">
            {cert.title}
          </Link>
          <span>/</span>
          <span>Practice Test</span>
        </div>

        <h1 className="mb-8">{cert.title} - Practice Test</h1>

        {questions.length === 0 ? (
          <p className="text-muted-foreground">
            No practice questions have been added for this certification yet. Add some from the
            admin dashboard under &ldquo;Practice Questions&rdquo;.
          </p>
        ) : (
          <PracticeTest certTitle={cert.title} questions={questions} />
        )}
      </div>
    </div>
  )
}

export function generateMetadata(): Metadata {
  return { title: 'Practice Test' }
}
