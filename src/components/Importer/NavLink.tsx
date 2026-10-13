import Link from 'next/link'
import React from 'react'

// Extra entries under the admin sidebar's collection links.
export default function ImportNavLink() {
  return (
    <>
    <Link href="/admin/import" className="nav__link" style={{ display: 'block', padding: '0.25rem 0' }}>
      <span className="nav__link-label">Import spreadsheets</span>
    </Link>
    <Link href="/admin/security" className="nav__link" style={{ display: 'block', padding: '0.25rem 0' }}>
      <span className="nav__link-label">Admin security</span>
    </Link>
    </>
  )
}
