import { Banner } from '@payloadcms/ui/elements/Banner'
import { Card } from '@payloadcms/ui'
import React from 'react'

import './index.scss'

const baseClass = 'before-dashboard'

// The template's "Seed your database" button was removed from here - it
// deleted all pages, posts, media and form submissions before inserting demo
// content, which is far too dangerous to keep one click away on a live site.
const BeforeDashboard: React.FC = () => {
  return (
    <div className={baseClass}>
      <Banner className={`${baseClass}__banner`} type="success">
        <h4>Welcome to the CertGenius dashboard</h4>
      </Banner>

      <h2 className={`${baseClass}__heading`}>Tools</h2>
      <div className={`${baseClass}__cards`}>
        <Card
          title="Import spreadsheets"
          href="/admin/import"
          buttonAriaLabel="Import certifications or questions from a spreadsheet"
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
