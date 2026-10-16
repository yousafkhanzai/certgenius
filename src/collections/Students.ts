import { ValidationError, type CollectionConfig } from 'payload'

import { adminOnly, adminOnlyField, adminOrSelf, isStudentUser } from '../access/roles'
import { isCountryCode, locationFromHeaders } from '../utilities/countries'

// Learners who sign up on the public site. Kept separate from `users`
// (admins) so a student account can never reach the admin dashboard.
export const Students: CollectionConfig = {
  slug: 'students',
  labels: { singular: 'Student', plural: 'Students' },
  auth: {
    maxLoginAttempts: 5,
    lockTime: 15 * 60 * 1000, // 15 minutes
    tokenExpiration: 60 * 60 * 24 * 7, // stay logged in for a week
    cookies: {
      sameSite: 'Lax',
      secure: process.env.NODE_ENV === 'production',
    },
  },
  access: {
    admin: () => false,
    create: () => true, // public sign-up
    read: adminOrSelf,
    update: adminOrSelf,
    delete: adminOrSelf,
    unlock: adminOnly,
  },
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'name', 'country', 'lastSeenAt', 'createdAt'],
    group: 'Students',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      maxLength: 80,
    },
    {
      name: 'dailyGoal',
      type: 'number',
      label: 'Daily goal (questions)',
      defaultValue: 25,
      min: 5,
      max: 500,
    },
    // Progress counters are maintained by the server, never by the student.
    {
      name: 'currentStreak',
      type: 'number',
      defaultValue: 0,
      access: { create: adminOnlyField, update: adminOnlyField },
      admin: { readOnly: true },
    },
    {
      name: 'longestStreak',
      type: 'number',
      defaultValue: 0,
      access: { create: adminOnlyField, update: adminOnlyField },
      admin: { readOnly: true },
    },
    {
      name: 'lastActiveDate',
      type: 'date',
      access: { create: adminOnlyField, update: adminOnlyField },
      admin: { readOnly: true },
    },
    // Location: detected from the internet connection at sign-up and login
    // (approximate, no GPS). A student can correct their country in their
    // profile; after that it is no longer overwritten.
    {
      name: 'country',
      type: 'text',
      maxLength: 2,
      admin: {
        position: 'sidebar',
        description: 'Two-letter country code, e.g. PK, GB, US.',
        components: { Cell: '@/components/AdminTools/CountryCell' },
      },
      validate: (value: unknown) => (value === null || value === undefined || value === '' || isCountryCode(value) ? true : 'Unknown country code'),
    },
    {
      name: 'countrySource',
      type: 'select',
      options: [
        { label: 'Detected automatically', value: 'auto' },
        { label: 'Chosen by the student', value: 'student' },
      ],
      access: { create: adminOnlyField, update: adminOnlyField },
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'city',
      type: 'text',
      maxLength: 100,
      access: { read: adminOnlyField, create: adminOnlyField, update: adminOnlyField },
      admin: { position: 'sidebar', readOnly: true, description: 'Approximate, from the internet connection.' },
    },
    {
      name: 'lastSeenAt',
      type: 'date',
      label: 'Last seen',
      access: { read: adminOnlyField, create: adminOnlyField, update: adminOnlyField },
      admin: { position: 'sidebar', readOnly: true, date: { pickerAppearance: 'dayAndTime' } },
    },
  ],
  hooks: {
    beforeChange: [
      ({ context, data, operation, originalDoc, req }) => {
        if (context.loginLocation) return data
        if (operation === 'create') {
          // Sign-up: record where the student signed up from.
          const where = locationFromHeaders(req.headers)
          if (!data.country && where.country) {
            data.country = where.country
            data.countrySource = 'auto'
          }
          if (where.city) data.city = where.city
          data.lastSeenAt = new Date().toISOString()
        } else if (isStudentUser(req) && data.country !== undefined && data.country !== originalDoc?.country) {
          // The student picked their own country: never overwrite it again.
          data.countrySource = 'student'
        }
        return data
      },
    ],
    afterLogin: [
      async ({ req, user }) => {
        if (req.payloadAPI === 'local') return
        const where = locationFromHeaders(req.headers)
        const data: Record<string, unknown> = { lastSeenAt: new Date().toISOString() }
        if (where.country && user.countrySource !== 'student') {
          data.country = where.country
          data.countrySource = 'auto'
        }
        if (where.city) data.city = where.city
        try {
          // Same request (and database transaction) as the login itself:
          // a separate save would wait forever for the login's lock on this row.
          await req.payload.update({
            collection: 'students',
            id: user.id,
            data,
            overrideAccess: true,
            depth: 0,
            req,
            context: { loginLocation: true },
          })
        } catch (err) {
          req.payload.logger.warn({ err }, 'Could not record student login location')
        }
      },
    ],
    beforeValidate: [
      ({ data }) => {
        const password = data?.password
        if (typeof password === 'string' && password.length < 10) {
          throw new ValidationError({
            collection: 'students',
            errors: [{ path: 'password', message: 'Password must be at least 10 characters.' }],
          })
        }
        if (typeof password === 'string' && password.length > 128) {
          throw new ValidationError({
            collection: 'students',
            errors: [{ path: 'password', message: 'Password must be at most 128 characters.' }],
          })
        }
        return data
      },
    ],
  },
  timestamps: true,
}
