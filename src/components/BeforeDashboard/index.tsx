import { Banner } from '@payloadcms/ui/elements/Banner'
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
      <ul className={`${baseClass}__instructions`}>
        <li>
          Add or edit certifications and practice questions under &ldquo;Certification
          Content&rdquo; in the menu.
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
