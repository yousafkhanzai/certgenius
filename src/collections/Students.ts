import { ValidationError, type CollectionConfig } from 'payload'

import { adminOnly, adminOnlyField, adminOrSelf } from '../access/roles'

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
    defaultColumns: ['email', 'name', 'currentStreak', 'createdAt'],
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
  ],
  hooks: {
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
