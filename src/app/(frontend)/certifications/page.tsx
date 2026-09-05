import type { Metadata } from 'next/types'

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import Link from 'next/link'
import React from 'react'

import { JsonLd } from '@/components/JsonLd'
import { breadcrumbSchema } from '@/utilities/schema'

export const dynamic = 'force-static'
export const revalidate = 600

export default async function CertificationsPage() {
  const payload = await getPayload({ config: configPromise })

  const certifications = await payload.find({
    collection: 'certifications',
    depth: 1,
    limit: 100,
    overrideAccess: false,
    sort: '-publishedAt',
  })

  return (
    <div className="pt-24 pb-24">
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Certifications', path: '/certifications' },
        ])}
      />
      <div className="container mb-12">
        <div className="prose dark:prose-invert max-w-none">
          <h1>Certification Practice Tests</h1>
          <p>
            Free practice questions and study guides for professional certifications. Pick a
            certification below to see an overview and start a practice test.
          </p>
        </div>
      </div>

      <div className="container">
        {certifications.docs.length === 0 && (
          <p className="text-muted-foreground">
            No certifications published yet. Add one from the admin dashboard under
            &ldquo;Certifications&rdquo;.
          </p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {certifications.docs.map((cert) => (
            <Link
              key={cert.id}
              href={`/certifications/${cert.slug}`}
              className="block border rounded-lg p-6 hover:shadow-md transition-shadow no-underline"
            >
              <div className="flex items-center gap-2 mb-2">
                {cert.vendor && (
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">
                    {cert.vendor}
                  </span>
                )}
                {cert.difficulty && (
                  <span className="text-xs uppercase tracking-wide rounded-full bg-muted px-2 py-0.5 ml-auto">
                    {cert.difficulty}
                  </span>
                )}
              </div>
              <h3 className="text-lg font-semibold mb-2">{cert.title}</h3>
              {cert.summary && (
                <p className="text-sm text-muted-foreground line-clamp-3">{cert.summary}</p>
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

export function generateMetadata(): Metadata {
  return {
    title: `Certification Practice Tests`,
    description:
      'Free AI-powered practice questions and study guides for professional certifications.',
  }
}
