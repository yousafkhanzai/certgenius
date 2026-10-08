import type { NextConfig } from 'next'

export const redirects: NextConfig['redirects'] = async () => {
  const internetExplorerRedirect = {
    destination: '/ie-incompatible.html',
    has: [
      {
        type: 'header' as const,
        key: 'user-agent',
        value: '(.*Trident.*)', // all ie browsers
      },
    ],
    permanent: false,
    source: '/:path((?!ie-incompatible.html$).*)', // all pages except the incompatibility page
  }

  // Question spreadsheets link study guides as /blog/<slug>/, while blog posts
  // live at /posts/<slug>. Temporary (307) so the blog's final address can
  // still be decided in Phase 5 without browsers having cached a permanent move.
  const blogToPosts = {
    source: '/blog/:slug',
    destination: '/posts/:slug',
    permanent: false,
  }

  return [internetExplorerRedirect, blogToPosts]
}
