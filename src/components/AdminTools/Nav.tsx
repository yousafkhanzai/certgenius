import Link from 'next/link'
import type { Payload, TypedUser } from 'payload'
import React from 'react'

import { pool } from '@/quiz/server'

import './tools.scss'

const TOOLS = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/health', label: 'Certification health' },
  { href: '/admin/import', label: 'Import spreadsheets' },
  { href: '/admin/reports', label: 'Problem reports', badge: true },
  { href: '/admin/students', label: 'Students' },
  { href: '/admin/stats', label: 'Site stats' },
  { href: '/admin/security', label: 'Admin security' },
]

// "Tools" section at the top of the admin menu, with the number of open
// problem reports next to "Problem reports".
export default async function ToolsNav({ payload, user }: { payload?: Payload; user?: TypedUser | null }) {
  let open = 0
  if (payload && user?.collection === 'users') {
    try {
      const { rows } = await pool(payload).query<{ n: number }>(
        `select count(*)::int n from problem_reports where status in ('open', 'reviewing') or status is null`,
      )
      open = rows[0]?.n || 0
    } catch {
      open = 0
    }
  }

  return (
    <div className="cg-tools__nav">
      <div className="cg-tools__nav-heading">Tools</div>
      {TOOLS.map((t) => (
        <Link key={t.href} href={t.href} className="nav__link">
          <span className="nav__link-label">{t.label}</span>
          {t.badge && open > 0 && (
            <span className="cg-tools__count" aria-label={`${open} open`}>
              {open}
            </span>
          )}
        </Link>
      ))}
    </div>
  )
}
