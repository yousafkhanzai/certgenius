import type { AdminViewServerProps } from 'payload'

import React from 'react'

import { problemReports, REPORT_STATUSES, type ReportStatus } from '@/admin/data'
import { ActionButton } from './ActionButton'
import { AdminPage, formatDate, isAdmin } from './AdminPage'

// Admin page at /admin/reports - students' "Report a problem" messages in one
// inbox: read the question, jump to editing it, then mark the report done.
export default async function ReportsView(props: AdminViewServerProps) {
  const raw = props.searchParams?.status
  const wanted = Array.isArray(raw) ? raw[0] : raw
  const status: ReportStatus | 'all' = wanted === 'all' || REPORT_STATUSES.some((s) => s.value === wanted) ? (wanted as ReportStatus | 'all') : 'open'
  const data = isAdmin(props) ? await problemReports(props.initPageResult.req.payload, status) : { reports: [], counts: {} as Record<string, number> }
  const tabs = [...REPORT_STATUSES, { value: 'all', label: 'All' } as const]

  return (
    <AdminPage
      props={props}
      title="Problem reports"
      lead="Messages students send with the “Report a problem” button. Fix the question, then mark the report as fixed."
    >
      <nav className="cg-tools__tabs" aria-label="Filter reports">
        {tabs.map((t) => (
          <a
            key={t.value}
            href={`/admin/reports?status=${t.value}`}
            className={`cg-tools__btn${t.value === status ? ' cg-tools__btn--primary' : ''}`}
            aria-current={t.value === status ? 'page' : undefined}
          >
            {t.label} ({data.counts[t.value] ?? 0})
          </a>
        ))}
      </nav>

      {data.reports.length === 0 && (
        <p className="cg-tools__muted">{status === 'open' ? 'No open reports. Nice work.' : 'Nothing here.'}</p>
      )}

      {data.reports.map((r) => {
        const current = r.status || 'open'
        return (
          <div key={r.id} className="cg-tools__card">
            <div className="cg-tools__row">
              <span
                className={`cg-tools__badge ${
                  current === 'fixed' ? 'cg-tools__badge--ok' : current === 'rejected' ? '' : current === 'reviewing' ? 'cg-tools__badge--warn' : 'cg-tools__badge--bad'
                }`}
              >
                {REPORT_STATUSES.find((s) => s.value === current)?.label}
              </span>
              <span className="cg-tools__muted">
                {[r.cert, r.domain].filter(Boolean).join(' · ')}
              </span>
              <span className="cg-tools__spacer" />
              <span className="cg-tools__muted">
                {formatDate(r.created_at)}
                {r.student ? ` · ${r.student}` : ''}
              </span>
            </div>
            <p style={{ margin: '12px 0 6px', fontWeight: 600 }}>
              {r.question_text ? r.question_text.slice(0, 300) : '(question was deleted)'}
              {r.correct && <span className="cg-tools__muted"> · correct answer: {r.correct}</span>}
            </p>
            <blockquote
              style={{ margin: '8px 0 0', padding: '8px 12px', borderLeft: '3px solid #2B44E8', background: 'var(--theme-elevation-50)', borderRadius: 8, whiteSpace: 'pre-line' }}
            >
              {r.message}
            </blockquote>
            <div className="cg-tools__row" style={{ marginTop: 14 }}>
              {r.question_text && (
                <a className="cg-tools__btn cg-tools__btn--primary" href={`/admin/collections/questions/${r.question_id}`}>
                  Edit the question
                </a>
              )}
              {current !== 'reviewing' && current !== 'fixed' && (
                <ActionButton endpoint="report-status" payload={{ id: r.id, status: 'reviewing' }} label="Mark reviewing" />
              )}
              {current !== 'fixed' && <ActionButton endpoint="report-status" payload={{ id: r.id, status: 'fixed' }} label="Mark fixed" />}
              {current !== 'rejected' && (
                <ActionButton endpoint="report-status" payload={{ id: r.id, status: 'rejected' }} label="Not a problem" />
              )}
              {(current === 'fixed' || current === 'rejected') && (
                <ActionButton endpoint="report-status" payload={{ id: r.id, status: 'open' }} label="Reopen" />
              )}
            </div>
          </div>
        )
      })}
    </AdminPage>
  )
}
