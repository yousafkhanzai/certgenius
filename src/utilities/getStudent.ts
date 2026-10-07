import configPromise from '@payload-config'
import { headers } from 'next/headers'
import { getPayload } from 'payload'

import type { Student } from '@/payload-types'

// The logged-in student for this request, or null for guests (and for admins,
// who are a different kind of account).
export async function getStudent(): Promise<Student | null> {
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: await headers() })
  return user?.collection === 'students' ? (user as Student) : null
}

// Only same-site paths are allowed after login, so a crafted link can't send
// someone to another website.
export function safeNextPath(next: string | string[] | undefined, fallback = '/account'): string {
  const value = Array.isArray(next) ? next[0] : next
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
    return fallback
  }
  return value
}
