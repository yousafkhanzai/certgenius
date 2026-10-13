import { Banner } from '@payloadcms/ui/elements/Banner'
import { Card } from '@payloadcms/ui'
import type { Payload } from 'payload'
import React from 'react'

import { gateConfig } from '@/security/adminGate'

import './index.scss'

const baseClass = 'before-dashboard'

// The template's "Seed your database" button was removed from here - it
// deleted all pages, posts, media and form submissions before inserting demo
// content, which is far too dangerous to keep one click away on a live site.
const BeforeDashboard = async ({ payload }: { payload: Payload }) => {
  const gateOn = Boolean(await gateConfig(payload))
  return (
    <div className={baseClass}>
      <Banner className={`${baseClass}__banner`} type="success">
        <h4>Welcome to the CertGenius dashboard</h4>
      </Banner>

      {!gateOn && (
        <Banner className={`${baseClass}__banner`} type="error">
          <h4>
            Your admin pattern lock is not set yet. <a href="/admin/security">Set it now</a> so the password
            alone is not enough to get in.
          </h4>
        </Banner>
      )}

      <h2 className={`${baseClass}__heading`}>Tools</h2>
      <div className={`${baseClass}__cards`}>
        <Card
          title="Import spreadsheets"
          href="/admin/import"
          buttonAriaLabel="Import certifications or questions from a spreadsheet"
        />
        <Card
          title={gateOn ? 'Admin security' : 'Admin security: set your pattern lock'}
          href="/admin/security"
          buttonAriaLabel="Set or change the admin pattern lock"
        />
      </div>

      <ul className={`${baseClass}__instructions`}>
        <li>
          Add or edit certifications and practice questions under &ldquo;Certification
          Content&rdquo; below, or <a href="/admin/import">import them from a spreadsheet</a>.
        </li>
        <li>
          <a href="/" target="_blank">
            Visit your website
          </a>{' '}
          to see your changes.
        </li>
      </ul>
    </div>
  )
}

export default BeforeDashboard
