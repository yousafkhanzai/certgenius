import React from 'react'
import Link from 'next/link'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { ArrowRight } from 'lucide-react'

const difficultyStyles: Record<string, string> = {
  beginner: 'bg-[oklch(94%_0.08_160deg)] text-[oklch(30%_0.1_160deg)]',
  intermediate: 'bg-[oklch(93%_0.09_85deg)] text-[oklch(35%_0.1_85deg)]',
  advanced: 'bg-chart-5 text-[oklch(20%_0.05_70deg)]',
}

// Section heading/copy is fixed in code (see TrustBar), but every certification
// shown here is real, live data pulled straight from the Certifications
// collection - editing a cert in admin updates this grid automatically.
export const FeaturedCertifications: React.FC = async () => {
  const payload = await getPayload({ config: configPromise })

  const certifications = await payload.find({
    collection: 'certifications',
    depth: 0,
    limit: 3,
    overrideAccess: false,
    sort: '-publishedAt',
  })

  if (certifications.docs.length === 0) return null

  return (
    <div className="bg-secondary/40 py-16 md:py-24">
      <div className="container">
        <div className="flex items-end justify-between mb-10 gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-primary mb-3">
              Certifications
            </div>
            <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight">
              Start a free practice test
            </h2>
          </div>
          <Link
            href="/certifications"
            className="hidden sm:flex items-center gap-1.5 text-sm font-semibold hover:text-primary shrink-0"
          >
            View all certifications
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {certifications.docs.map((cert) => {
            const difficultyClass =
              (cert.difficulty && difficultyStyles[cert.difficulty]) ||
              'bg-accent text-accent-foreground'

            return (
              <Link
                key={cert.id}
                href={`/certifications/${cert.slug}`}
                className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-7 shadow-sm hover:shadow-lg transition-shadow no-underline"
              >
                <div className="flex items-center justify-between">
                  {cert.vendor && (
                    <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      {cert.vendor}
                    </span>
                  )}
                  {cert.difficulty && (
                    <span
                      className={`text-[11px] font-bold uppercase tracking-wide rounded-full px-3 py-1 whitespace-nowrap ${difficultyClass}`}
                    >
                      {cert.difficulty}
                    </span>
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-2">{cert.title}</h3>
                  {cert.summary && (
                    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                      {cert.summary}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-sm font-bold text-primary mt-auto pt-3 border-t border-border">
                  Start test
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </Link>
            )
          })}
        </div>

        <Link
          href="/certifications"
          className="sm:hidden flex items-center justify-center gap-1.5 text-sm font-semibold mt-8"
        >
          View all certifications
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  )
}
