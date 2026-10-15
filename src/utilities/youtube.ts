// YouTube links on blog posts. Accepts the usual link shapes:
//   https://www.youtube.com/watch?v=ID, https://youtu.be/ID,
//   https://www.youtube.com/embed/ID, https://www.youtube.com/shorts/ID
const ID = /^[A-Za-z0-9_-]{11}$/
const HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'www.youtube-nocookie.com'])

export function youtubeId(link: unknown): string | null {
  if (typeof link !== 'string' || !link.trim()) return null
  let url: URL
  try {
    url = new URL(link.trim())
  } catch {
    return null
  }
  if (url.protocol !== 'https:' || !HOSTS.has(url.hostname)) return null
  const parts = url.pathname.split('/').filter(Boolean)
  const id =
    url.hostname === 'youtu.be'
      ? parts[0]
      : parts[0] === 'watch'
        ? url.searchParams.get('v')
        : ['embed', 'shorts', 'live'].includes(parts[0])
          ? parts[1]
          : null
  return id && ID.test(id) ? id : null
}

export const validateYouTubeUrl = (value: unknown): true | string => {
  if (value === null || value === undefined || value === '') return true
  return youtubeId(value) ? true : 'Must be a YouTube video link, e.g. https://www.youtube.com/watch?v=abc123XYZ_0'
}
