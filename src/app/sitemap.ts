import type { MetadataRoute } from 'next'

import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { LEGAL_PAGES } from '@/components/site/LegalPage'
import { listedCertifications } from '@/site/data'
import { categoryHref, publishedCategories, publishedVendors } from '@/site/taxonomy'
import { getServerSideURL } from '@/utilities/getURL'

// /sitemap.xml - every public page, for search engines. PUBLISHING RULE:
// built only from published content; draft certifications and blogs never
// appear. Rebuilt every 10 minutes.
export const revalidate = 600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const url = getServerSideURL()
  const payload = await getPayload({ config: configPromise })

  const [certs, categories, vendors, posts, pages] = await Promise.all([
    listedCertifications(),
    publishedCategories(),
    publishedVendors(),
    payload.find({
      collection: 'posts',
      depth: 0,
      limit: 0,
      overrideAccess: false,
      pagination: false,
      where: { _status: { equals: 'published' } },
      select: { slug: true, updatedAt: true },
    }),
    payload.find({
      collection: 'pages',
      depth: 0,
      limit: 0,
      overrideAccess: false,
      pagination: false,
      where: { _status: { equals: 'published' } },
      select: { slug: true, updatedAt: true },
    }),
  ])
  const ready = certs.filter((c) => c.questions > 0)
  const newest = (dates: Array<string | null | undefined>) =>
    dates.filter((d): d is string => Boolean(d)).sort().at(-1) || undefined

  const certsUpdated = newest(ready.map((c) => c.updatedAt))
  const entry = (path: string, lastModified?: string, priority = 0.5): MetadataRoute.Sitemap[number] => ({
    url: `${url}${path}`,
    ...(lastModified ? { lastModified } : {}),
    priority,
  })

  return [
    entry('/', certsUpdated, 1),
    entry('/certifications', certsUpdated, 0.9),
    entry('/categories', certsUpdated, 0.6),
    entry('/vendors', certsUpdated, 0.6),
    entry('/posts', newest(posts.docs.map((p) => p.updatedAt)), 0.7),
    entry('/faq', undefined, 0.5),
    ...ready.map((c) => entry(`/certifications/${c.slug}`, c.updatedAt, 0.9)),
    ...categories.map((c) => entry(categoryHref(c.value), newest(c.certs.map((x) => x.updatedAt)), 0.6)),
    ...vendors.map((v) => entry(`/vendors/${v.slug}`, newest(v.certs.map((x) => x.updatedAt)), 0.6)),
    ...posts.docs.filter((p) => p.slug).map((p) => entry(`/posts/${p.slug}`, p.updatedAt, 0.7)),
    ...pages.docs.filter((p) => p.slug && p.slug !== 'home').map((p) => entry(`/${p.slug}`, p.updatedAt, 0.4)),
    ...LEGAL_PAGES.map((p) => entry(p.path, undefined, 0.2)),
  ]
}
