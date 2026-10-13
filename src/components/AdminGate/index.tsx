import type { AdminViewServerProps } from 'payload'

import { DefaultTemplate } from '@payloadcms/next/templates'
import { Gutter } from '@payloadcms/ui'
import { redirect } from 'next/navigation'
import React from 'react'

import { ADMIN_PASSWORD_MIN } from '@/collections/Users'
import { gateConfig } from '@/security/adminGate'
import { SecurityClient } from './SecurityClient'

// Admin page at /admin/security - set or change the pattern lock.
export default async function SecurityView({ initPageResult, params, searchParams }: AdminViewServerProps) {
  const { req, permissions, locale, visibleEntities } = initPageResult

  if (req.user?.collection !== 'users') {
    redirect('/admin/login')
  }

  const config = await gateConfig(req.payload)

  return (
    <DefaultTemplate
      i18n={req.i18n}
      locale={locale}
      params={params}
      payload={req.payload}
      permissions={permissions}
      req={req}
      searchParams={searchParams}
      user={req.user}
      visibleEntities={visibleEntities}
    >
      <Gutter>
        <h1 style={{ margin: '1.5rem 0 0.5rem' }}>Admin security</h1>
        <p style={{ opacity: 0.75, marginBottom: '1.5rem', maxWidth: 640 }}>
          The pattern lock is a second lock on this admin. The login page only appears after the pattern is
          drawn, and the password alone is not enough to get in. Join at least 5 dots; avoid simple shapes
          such as a straight line or the letter L.
        </p>
        <p style={{ marginBottom: '1.5rem', fontWeight: 600 }}>
          {config
            ? `Pattern lock: ON (set ${new Date(config.setAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}).`
            : 'Pattern lock: OFF. Draw a pattern below to turn it on.'}
        </p>
        <SecurityClient hasPattern={Boolean(config)} />
        <h2 style={{ margin: '2.5rem 0 0.5rem' }}>Your other protections</h2>
        <ul style={{ maxWidth: 640, lineHeight: 1.7 }}>
          <li>
            Password: at least {ADMIN_PASSWORD_MIN} characters with upper-case, lower-case, a number and a
            symbol. Change it under Users &gt; your account.
          </li>
          <li>5 wrong passwords or 5 wrong patterns lock the door for 15 minutes.</li>
          <li>You are logged out automatically after 2 hours, and the pattern is asked again after 12 hours.</li>
          <li>No new admin accounts can be created, even by a logged-in admin.</li>
        </ul>
      </Gutter>
    </DefaultTemplate>
  )
}
