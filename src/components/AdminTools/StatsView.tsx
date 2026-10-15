import type { AdminViewServerProps } from 'payload'

import React from 'react'

import { siteStats } from '@/admin/data'
import { AdminPage, isAdmin } from './AdminPage'

// Admin page at /admin/stats - how the site is being used.
export default async function StatsView(props: AdminViewServerProps) {
  if (!isAdmin(props)) return <AdminPage props={props} title="Site stats">{null}</AdminPage>
  const s = await siteStats(props.initPageResult.req.payload)
  const accuracy = s.answers.d7 ? Math.round((100 * s.answers.correct7) / s.answers.d7) : null
  const passRate = s.attempts.exams ? Math.round((100 * s.attempts.passed) / s.attempts.exams) : null
  const maxDay = Math.max(1, ...s.daily.map((d) => d.n))

  return (
    <AdminPage props={props} title="Site stats" lead="How students are using CertGenius. Numbers update every time you open this page.">
      <h2 className="cg-tools__section">Students</h2>
      <div className="cg-tools__tiles">
        <Tile n={s.students.total} label="Students in total" />
        <Tile n={s.students.d7} label="New in the last 7 days" />
        <Tile n={s.students.d30} label="New in the last 30 days" />
        <Tile n={s.answers.active7} label="Practised in the last 7 days" />
      </div>

      <h2 className="cg-tools__section">Practice and exams</h2>
      <div className="cg-tools__tiles">
        <Tile n={s.answers.today} label="Questions answered today" />
        <Tile n={s.answers.d7} label="Answered in the last 7 days" />
        <Tile n={accuracy === null ? '-' : `${accuracy}%`} label="Answered correctly (7 days)" />
        <Tile n={s.answers.total} label="Answered all time" />
        <Tile n={s.attempts.practice7} label="Practice sessions (7 days)" />
        <Tile n={s.attempts.exams} label="Exam simulations finished" />
        <Tile n={passRate === null ? '-' : `${passRate}%`} label="Exam pass rate" />
        <Tile n={s.attempts.avg_score === null ? '-' : `${s.attempts.avg_score}%`} label="Average exam score" />
      </div>

      <div className="cg-tools__card">
        <strong>Questions answered per day (last 14 days)</strong>
        <div className="cg-tools__bars" role="img" aria-label="Questions answered per day for the last 14 days">
          {s.daily.map((d) => (
            <div
              key={d.day}
              className="cg-tools__bar"
              title={`${d.day}: ${d.n}`}
              style={{ height: `${Math.max(2, (d.n / maxDay) * 100)}%`, opacity: d.n ? 1 : 0.25 }}
            />
          ))}
        </div>
        <div className="cg-tools__row cg-tools__muted" style={{ marginTop: 6 }}>
          <span>{s.daily[0]?.day}</span>
          <span className="cg-tools__spacer" />
          <span>today ({s.daily.at(-1)?.n ?? 0})</span>
        </div>
      </div>

      <h2 className="cg-tools__section">Content</h2>
      <div className="cg-tools__tiles">
        <Tile n={s.content.certs_live} label="Certifications live" href="/admin/health" />
        <Tile n={s.content.certs_draft} label="Certifications in draft" href="/admin/health" />
        <Tile n={s.content.questions} label="Questions in the bank" href="/admin/collections/questions" />
        <Tile n={s.content.blogs} label="Published blogs" href="/admin/collections/posts" />
        <Tile n={s.content.bookmarks} label="Bookmarks saved by students" />
        <Tile n={s.openReports} label="Open problem reports" href="/admin/reports" alert={s.openReports > 0} />
      </div>

      <h2 className="cg-tools__section">Most practised certifications (30 days)</h2>
      {s.topCerts.length ? (
        <div className="cg-tools__card cg-tools__scroll">
          <table className="cg-tools__table">
            <thead>
              <tr>
                <th>Certification</th>
                <th>Questions answered</th>
              </tr>
            </thead>
            <tbody>
              {s.topCerts.map((c) => (
                <tr key={c.id}>
                  <td>
                    <a href={`/admin/collections/certifications/${c.id}`}>{c.title}</a>
                  </td>
                  <td>{c.n}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="cg-tools__muted">No practice in the last 30 days yet.</p>
      )}

      <h2 className="cg-tools__section">Questions students get wrong most</h2>
      <p className="cg-tools__muted" style={{ marginTop: 0 }}>
        Questions with at least 5 answers. A very high wrong rate can mean the question is hard, or that its answer or wording needs
        checking.
      </p>
      {s.missed.length ? (
        <div className="cg-tools__card cg-tools__scroll">
          <table className="cg-tools__table">
            <thead>
              <tr>
                <th>Question</th>
                <th>Certification / domain</th>
                <th>Answers</th>
                <th>Wrong</th>
              </tr>
            </thead>
            <tbody>
              {s.missed.map((q) => (
                <tr key={q.id}>
                  <td>
                    <a href={`/admin/collections/questions/${q.id}`}>{q.text}</a>
                  </td>
                  <td>
                    {q.cert}
                    <div className="cg-tools__muted">{q.domain}</div>
                  </td>
                  <td>{q.answers}</td>
                  <td>
                    <span className={`cg-tools__badge ${q.wrong_pct >= 70 ? 'cg-tools__badge--bad' : 'cg-tools__badge--warn'}`}>{q.wrong_pct}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="cg-tools__muted">Not enough answers yet.</p>
      )}
    </AdminPage>
  )
}

function Tile({ n, label, href, alert }: { n: number | string; label: string; href?: string; alert?: boolean }) {
  const className = `cg-tools__tile${href ? ' cg-tools__tile--link' : ''}${alert ? ' cg-tools__tile--alert' : ''}`
  const inner = (
    <>
      <span className="cg-tools__num">{typeof n === 'number' ? n.toLocaleString('en-GB') : n}</span>
      <span className="cg-tools__label">{label}</span>
    </>
  )
  return href ? (
    <a href={href} className={className}>
      {inner}
    </a>
  ) : (
    <div className={className}>{inner}</div>
  )
}
