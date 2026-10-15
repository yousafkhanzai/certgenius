import canUseDOM from './canUseDOM'

// The site's public address, used for canonical links, the sitemap and
// structured data. NEXT_PUBLIC_SERVER_URL wins when it is set - except that a
// localhost value is ignored on Vercel (it was copied from the template), so
// search engines are never told the site lives on localhost.
const isLocal = (url: string) => /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?(\/|$)/.test(url)

export const getServerSideURL = () => {
  const configured = process.env.NEXT_PUBLIC_SERVER_URL
  if (configured && !(process.env.VERCEL && isLocal(configured))) return configured.replace(/\/+$/, '')
  return process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'http://localhost:3000'
}

export const getClientSideURL = () => {
  if (canUseDOM) {
    const protocol = window.location.protocol
    const domain = window.location.hostname
    const port = window.location.port

    return `${protocol}//${domain}${port ? `:${port}` : ''}`
  }

  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  }

  return process.env.NEXT_PUBLIC_SERVER_URL || ''
}
