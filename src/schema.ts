// schema.org / JSON-LD structured data helpers.
//
// Google has deprecated FAQ rich results (May 2026) and Practice
// Problem/Quiz rich results (January 2026) - so FAQPage and Quiz markup no
// longer earn any visible search result enhancement, even though the
// schema.org types still technically exist. We deliberately don't generate
// those here. What's below is what's still live and worth having:
// Organization/WebSite (site identity), BreadcrumbList (breadcrumb rich
// display), Course (certification pages), and Article (blog posts).
import { getServerSideURL } from './getURL'

const SITE_NAME = 'CertGenius'

export function organizationSchema() {
  const url = getServerSideURL()

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url,
    logo: `${url}/favicon.svg`,
  }
}

export function websiteSchema() {
  const url = getServerSideURL()

  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${url}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }
}

export function breadcrumbSchema(items: Array<{ name: string; path: string }>) {
  const url = getServerSideURL()

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${url}${item.path}`,
    })),
  }
}

type CourseInput = {
  title: string
  slug: string
  summary?: string | null
  vendor?: string | null
  examCode?: string | null
}

// A Course rich result in Google Search additionally requires at least 3
// courses marked up on the site plus Carousel markup on a listing page -
// this per-page markup is the piece that becomes eligible once that's true.
export function courseSchema(cert: CourseInput) {
  const url = getServerSideURL()

  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: cert.title,
    description: cert.summary || `Free practice test and study guide for ${cert.title}.`,
    url: `${url}/certifications/${cert.slug}`,
    provider: {
      '@type': 'Organization',
      name: SITE_NAME,
      url,
    },
    ...(cert.examCode ? { courseCode: cert.examCode } : {}),
  }
}

type ArticleInput = {
  title: string
  slug: string
  description?: string | null
  publishedAt?: string | null
  updatedAt?: string | null
  imageUrl?: string | null
  authorNames?: string[]
}

export function articleSchema(post: ArticleInput) {
  const url = getServerSideURL()
  const pageUrl = `${url}/posts/${post.slug}`

  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description || undefined,
    url: pageUrl,
    mainEntityOfPage: pageUrl,
    ...(post.imageUrl ? { image: post.imageUrl } : {}),
    ...(post.publishedAt ? { datePublished: post.publishedAt } : {}),
    ...(post.updatedAt ? { dateModified: post.updatedAt } : {}),
    author:
      post.authorNames && post.authorNames.length > 0
        ? post.authorNames.map((name) => ({ '@type': 'Person', name }))
        : { '@type': 'Organization', name: SITE_NAME },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      logo: {
        '@type': 'ImageObject',
        url: `${url}/favicon.svg`,
      },
    },
  }
}
