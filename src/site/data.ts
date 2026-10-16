import configPromise from '@payload-config'
import { getPayload, type Payload } from 'payload'
import { cache } from 'react'

import { CERT_CATEGORIES, visibleInListings, type CertCategory } from '@/collections/Certifications/options'
import type { Certification } from '@/payload-types'
import { IN_A_DOMAIN, pool } from '@/quiz/server'

// Data for the public pages. PUBLISHING RULE: everything here is computed
// from PUBLISHED certifications that are visible in listings (not Retired or
// On hold). Draft certifications never appear in any list, count or stat.

// Exam codes are for the admin only, so they are deliberately not part of this public data.
export type CertCard = {
  id: number
  title: string
  slug: string
  vendor: string | null
  category: CertCategory | null
  status: Certification['examStatus']
  summary: string | null
  passScore: number | null
  examQuestions: number | null
  minutes: number | null
  domains: number
  questions: number
  publishedAt: string | null
  updatedAt: string
}

export async function questionCountsByCertification(payload: Payload): Promise<Map<number, number>> {
  const { rows } = await pool(payload).query<{ certification_id: number; n: number }>(
    `select certification_id, count(*)::int as n from questions
     where option_a is not null and correct_answer is not null and ${IN_A_DOMAIN} group by certification_id`,
  )
  return new Map(rows.map((r) => [r.certification_id, r.n]))
}

export const listedCertifications = cache(async (): Promise<CertCard[]> => {
  const payload = await getPayload({ config: configPromise })
  const [found, counts] = await Promise.all([
    payload.find({
      collection: 'certifications',
      depth: 0,
      limit: 500,
      pagination: false,
      overrideAccess: false,
      sort: '-publishedAt',
      where: visibleInListings,
    }),
    questionCountsByCertification(payload),
  ])
  return found.docs.map((c) => ({
    id: Number(c.id),
    title: c.title,
    slug: c.slug as string,
    vendor: c.vendor ?? null,
    category: (c.certCategory as CertCategory | null) ?? null,
    status: c.examStatus,
    summary: c.summary ?? null,
    passScore: c.passingScore ?? null,
    examQuestions: c.examQuestionCount ?? null,
    minutes: c.durationMinutes ?? null,
    domains: (c.domains || []).length,
    questions: counts.get(Number(c.id)) || 0,
    publishedAt: c.publishedAt ?? null,
    updatedAt: c.updatedAt,
  }))
})

export type HomeData = Awaited<ReturnType<typeof homeData>>

// cache(): the header, footer and page share one lookup per render.
export const homeData = cache(async () => {
  const payload = await getPayload({ config: configPromise })
  const certs = await listedCertifications()
  const ready = certs.filter((c) => c.questions > 0)

  const [guides, latestPosts] = await Promise.all([
    payload.count({ collection: 'posts', overrideAccess: false }),
    payload.find({
      collection: 'posts',
      depth: 0,
      limit: 3,
      overrideAccess: false,
      sort: '-publishedAt',
      select: { title: true, slug: true, meta: true, publishedAt: true },
    }),
  ])

  const vendorMap = new Map<string, number>()
  for (const c of ready) if (c.vendor) vendorMap.set(c.vendor, (vendorMap.get(c.vendor) || 0) + 1)
  const vendors = [...vendorMap.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))

  const categories = CERT_CATEGORIES.map((cat) => ({
    ...cat,
    count: ready.filter((c) => c.category === cat.value).length,
  }))

  return {
    stats: {
      questions: ready.reduce((s, c) => s + c.questions, 0),
      certifications: ready.length,
      vendors: vendors.length,
      guides: guides.totalDocs,
    },
    // Most questions first: the best-stocked certifications are the popular picks.
    popular: [...ready].sort((a, b) => b.questions - a.questions).slice(0, 6),
    justAdded: ready.slice(0, 4),
    // Published "New" certifications that have no questions yet.
    comingSoon: certs.filter((c) => c.status === 'new' && c.questions === 0).slice(0, 4),
    vendors,
    categories,
    posts: latestPosts.docs.map((p) => ({
      title: p.title,
      slug: p.slug as string,
      description: p.meta?.description ?? null,
      publishedAt: p.publishedAt ?? null,
    })),
    footerCerts: [...ready].sort((a, b) => b.questions - a.questions).slice(0, 5),
  }
})
