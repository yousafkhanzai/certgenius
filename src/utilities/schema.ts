// schema.org / JSON-LD structured data helpers.
//
// Organization/WebSite (site identity), BreadcrumbList, Course (certification
// pages), Article and VideoObject (blog posts), CollectionPage (category and
// vendor pages), plus FAQPage and Quiz as the spec asks. Google stopped
// showing FAQ (May 2026) and Quiz (January 2026) rich results, but the markup
// is still valid schema.org and helps other search engines read the page.
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

// A listing page (category, vendor) and the certifications on it.
export function collectionPageSchema(page: {
  name: string
  description: string
  path: string
  items: Array<{ name: string; path: string }>
}) {
  const url = getServerSideURL()

  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: page.name,
    description: page.description,
    url: `${url}${page.path}`,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: page.items.length,
      itemListElement: page.items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        url: `${url}${item.path}`,
      })),
    },
  }
}

// The YouTube video at the top of a blog post.
export function videoSchema(video: {
  youtubeId: string
  name: string
  description?: string | null
  uploadDate?: string | null
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: video.name,
    description: video.description || video.name,
    thumbnailUrl: `https://i.ytimg.com/vi/${video.youtubeId}/hqdefault.jpg`,
    ...(video.uploadDate ? { uploadDate: video.uploadDate } : {}),
    embedUrl: `https://www.youtube-nocookie.com/embed/${video.youtubeId}`,
    contentUrl: `https://www.youtube.com/watch?v=${video.youtubeId}`,
  }
}

// The sample questions on a certification page.
export function quizSchema(quiz: {
  name: string
  path: string
  questions: Array<{ text: string; options: string[]; correct: string; explanation?: string | null }>
}) {
  const url = getServerSideURL()

  return {
    '@context': 'https://schema.org',
    '@type': 'Quiz',
    name: quiz.name,
    url: `${url}${quiz.path}`,
    educationalLevel: 'Professional certification',
    hasPart: quiz.questions.map((q) => ({
      '@type': 'Question',
      eduQuestionType: 'Multiple choice',
      text: q.text,
      suggestedAnswer: q.options.filter((o) => o !== q.correct).map((text) => ({ '@type': 'Answer', text })),
      acceptedAnswer: {
        '@type': 'Answer',
        text: q.correct,
        ...(q.explanation ? { answerExplanation: { '@type': 'Comment', text: q.explanation } } : {}),
      },
    })),
  }
}
