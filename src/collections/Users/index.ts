import { APIError, ValidationError, type CollectionConfig } from 'payload'

import { authenticated } from '../../access/authenticated'
import { gateIsOpen } from '../../security/adminGate'

// Admin password rule: long and mixed, so it can't be guessed or brute-forced.
export const ADMIN_PASSWORD_MIN = 14
export function adminPasswordProblem(password: string): string | null {
  if (password.length < ADMIN_PASSWORD_MIN) return `Password must be at least ${ADMIN_PASSWORD_MIN} characters.`
  if (password.length > 128) return 'Password must be at most 128 characters.'
  if (!/[a-z]/.test(password)) return 'Password must include a lower-case letter.'
  if (!/[A-Z]/.test(password)) return 'Password must include an upper-case letter.'
  if (!/[0-9]/.test(password)) return 'Password must include a number.'
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password must include a symbol (for example ! ? # or -).'
  if (/(.)\1{3,}/.test(password)) return 'Password must not repeat the same character four times in a row.'
  return null
}

// Admins - the people who log in to /admin to manage content.
// SECURITY: this site has a single owner. New admin accounts cannot be
// created from the admin or the API (not even by a logged-in admin) unless
// ALLOW_ADMIN_CREATION=true is set on the server on purpose. The very first
// account on an empty database is still created through Payload's own
// "create first user" screen.
export const Users: CollectionConfig = {
  slug: 'users',
  access: {
    admin: authenticated,
    create: (args) => process.env.ALLOW_ADMIN_CREATION === 'true' && authenticated(args),
    delete: authenticated,
    read: authenticated,
    update: authenticated,
    unlock: authenticated,
  },
  admin: {
    defaultColumns: ['name', 'email'],
    useAsTitle: 'name',
  },
  auth: {
    // Locks an account for 15 minutes after 5 wrong passwords in a row,
    // which stops password-guessing attacks on the admin login.
    maxLoginAttempts: 5,
    lockTime: 15 * 60 * 1000,
    // Admin sessions end after 2 hours without logging in again.
    tokenExpiration: 60 * 60 * 2,
    cookies: {
      sameSite: 'Lax',
      secure: process.env.NODE_ENV === 'production',
    },
  },
  fields: [
    {
      name: 'name',
      type: 'text',
    },
  ],
  hooks: {
    // PATTERN LOCK: the login (and password reset) API refuses everyone who
    // has not drawn the pattern first - checked before the password is even
    // looked at, so it gives no hint whether a password was right. Scripts run
    // on the server itself (the local API) are not affected.
    beforeOperation: [
      async ({ operation, req }) => {
        if (!['login', 'forgotPassword', 'resetPassword'].includes(operation)) return
        if (req.payloadAPI === 'local') return
        if (!(await gateIsOpen(req.payload, req.headers?.get('cookie')))) {
          throw new APIError('Draw your admin pattern first, at /admin-gate.', 403, undefined, true)
        }
      },
    ],
    beforeValidate: [
      ({ data }) => {
        const password = data?.password
        if (typeof password === 'string') {
          const problem = adminPasswordProblem(password)
          if (problem) {
            throw new ValidationError({ collection: 'users', errors: [{ path: 'password', message: problem }] })
          }
        }
        return data
      },
    ],
  },
  timestamps: true,
}
