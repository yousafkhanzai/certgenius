import type { AccessArgs } from 'payload'

import type { User } from '@/payload-types'

type isAuthenticated = (args: AccessArgs<User>) => boolean

// "Authenticated" here means a logged-in ADMIN (the `users` collection).
// Students are logged in too, but must never get content-management access.
export const authenticated: isAuthenticated = ({ req: { user } }) => {
  return user?.collection === 'users'
}
