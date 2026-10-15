import { Banner } from '@payloadcms/ui/elements/Banner'
import type { Payload } from 'payload'
import React from 'react'

import { pool } from '@/quiz/server'
import { gateConfig } from '@/security/adminGate'

import '../AdminTools/tools.scss'
import './index.scss'

const baseClass = 'before-dashboard'

const ACTIONS = [
  { href: '/admin/collections/certifications/create', label: 'Add a certification', primary: true },
  { href: '/admin/import', label: 'Import spreadsheets' },
  { href: '/admin/collections/posts/create', label: 'Write a blog post' },
  { href: '/admin/collections/questions/create', label: 'Add a question' },
  { href: '/admin/health', label: 'Certification health' },
  { href: '/', label: 'Open the website', external: true },
]

// The admin home: key numbers, quick actions and the content workflow.
// (The template's "Seed your database" button was removed: it deleted all
// content before inserting demo data.)
const BeforeDashboard = async ({ payload }: { payload: Payload }) => {
  const gateOn = Boolean(await gateConfig(payload))
  const { rows } = await pool(payload).query<{
    live: number
    draft: number
    questions: number
    open_reports: number
    new_students: number
    answers_today: number
  }>(
    `select (select count(*) from certifications where _status = 'published')::int live,
            (select count(*) from certifications where _status is distinct from 'published')::int draft,
            (select count(*) from questions where option_a is not null)::int questions,
            (select count(*) from problem_reports where status in ('open', 'reviewing') or status is null)::int open_reports,
            (select count(*) from students where created_at > now() - interval '7 days')::int new_students,
            (select count(*) from attempt_answers where answered_at >= date_trunc('day', now()))::int answers_today`,
  )
  const n = rows[0]

  const tiles = [
    { n: n.live, label: 'Certifications live', href: '/admin/health' },
    { n: n.draft, label: 'Certifications in draft', href: '/admin/health' },
    { n: n.questions, label: 'Questions in the bank', href: '/admin/collections/questions' },
    { n: n.open_reports, label: 'Open problem reports', href: '/admin/reports', alert: n.open_reports > 0 },
    { n: n.new_students, label: 'New students this week', href: '/admin/stats' },
    { n: n.answers_today, label: 'Questions answered today', href: '/admin/stats' },
  ]

  return (
    <div className={`${baseClass} cg-tools`}>
      {!gateOn && (
        <Banner className={`${baseClass}__banner`} type="error">
          <h4>
            Your admin pattern lock is not set yet. <a href="/admin/security">Set it now</a> so the password alone is not enough to
            get in.
          </h4>
        </Banner>
      )}

      <h2 className={`${baseClass}__heading`}>At a glance</h2>
      <div className="cg-tools__tiles">
        {tiles.map((t) => (
          <a key={t.label} href={t.href} className={`cg-tools__tile cg-tools__tile--link${t.alert ? ' cg-tools__tile--alert' : ''}`}>
            <span className="cg-tools__num">{t.n.toLocaleString('en-GB')}</span>
            <span className="cg-tools__label">{t.label}</span>
          </a>
        ))}
      </div>

      <h2 className={`${baseClass}__heading`}>Quick actions</h2>
      <div className="cg-tools__row" style={{ marginBottom: 24 }}>
        {ACTIONS.map((a) => (
          <a
            key={a.href}
            href={a.href}
            className={`cg-tools__btn${a.primary ? ' cg-tools__btn--primary' : ''}`}
            {...(a.external ? { target: '_blank', rel: 'noreferrer' } : {})}
          >
            {a.label}
          </a>
        ))}
      </div>

      <h2 className={`${baseClass}__heading`}>How to add a certification</h2>
      <ol className={`${baseClass}__instructions`}>
        <li>
          <strong>Certification:</strong> add it with its domains and short description (Add a certification, or Import
          spreadsheets). It stays a draft.
        </li>
        <li>
          <strong>Questions:</strong> import the questions for every domain (Import spreadsheets).
        </li>
        <li>
          <strong>Blogs:</strong> upload one blog per domain (Import spreadsheets, Study-guide blogs) and publish them.
        </li>
        <li>
          <strong>Publish:</strong> open <a href="/admin/health">Certification health</a>. When everything is ticked, press Publish.
        </li>
      </ol>
    </div>
  )
}

export default BeforeDashboard
