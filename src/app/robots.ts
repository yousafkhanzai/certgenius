import type { MetadataRoute } from 'next'

import { getServerSideURL } from '@/utilities/getURL'

// /robots.txt - tells search engines what to read. Private and personal
// screens (admin, account, quizzes, results) are kept out of search.
export default function robots(): MetadataRoute.Robots {
  const url = getServerSideURL()
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin',
        '/admin-gate',
        '/api/',
        '/next/',
        '/account',
        '/bookmarks',
        '/login',
        '/signup',
        '/search',
        '/certifications/*/quiz',
        '/certifications/*/practice',
        '/certifications/*/exam/',
        '/certifications/*/results/',
      ],
    },
    sitemap: `${url}/sitemap.xml`,
  }
}
