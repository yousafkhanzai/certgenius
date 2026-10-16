import type { AdminViewServerProps } from 'payload'

import React from 'react'

import { mostlyDoing, studentDetail, studentList, type StudentRow } from '@/admin/data'
import { countryName } from '@/utilities/countries'
import { AdminPage, formatDate, isAdmin } from './AdminPage'
import { DownloadCsv } from './DownloadCsv'

// Admin page at /admin/students - every student: name, email, location, what
// they mostly do (practice or exam simulations) and how they are doing.
// /admin/students?id=12 shows one student in detail.
export default async function StudentsView(props: AdminViewServerProps) {
  const sp = props.searchParams || {}
  const one = (v: unknown) => (Array.isArray(v) ? v[0] : v) as string | undefined
  const id = Number(one(sp.id))
  const payload = props.initPageResult.req.payload

  if (!isAdmin(props)) return <AdminPage props={props} title="Students">{null}</AdminPage>

  if (Number.isInteger(id) && id > 0) {
    const detail = await studentDetail(payload, id)
    return (
      <AdminPage props={props} title={detail?.student?.name || detail?.student?.email || 'Student'}>
        <p>
          <a href="/admin/students">← All students</a>
        </p>
        {!detail?.student ? <p>Student not found.</p> : <Detail detail={detail} />}
      </AdminPage>
    )
  }

  const q = (one(sp.q) || '').trim().slice(0, 100)
  const country = (one(sp.country) || '').toUpperCase().slice(0, 2)
  const { students, countries } = await studentList(payload, { q: q || undefined, country: country || undefined })
  const totals = {
    all: countries.reduce((s, c) => s + c.n, 0),
    practice: students.filter((s) => mostlyDoing(s).includes('practice') || mostlyDoing(s) === 'Practice only').length,
    exams: students.filter((s) => mostlyDoing(s) === 'Mostly exam simulations').length,
    idle: students.filter((s) => mostlyDoing(s) === 'Not started yet').length,
  }

  const csvRows = [
    ['Name', 'Email', 'Country', 'City', 'Joined', 'Last seen', 'Mostly', 'Questions answered', 'Correct %', 'Practice sessions', 'Exams finished', 'Exams passed', 'Average exam score', 'Most practised certification'],
    ...students.map((s) => [
      s.name || '',
      s.email,
      countryName(s.country),
      s.city || '',
      formatDate(s.joined),
      formatDate(s.last_seen),
      mostlyDoing(s),
      String(s.answers),
      s.answers ? String(Math.round((100 * s.correct) / s.answers)) : '',
      String(s.practice_sessions),
      String(s.exams_finished),
      String(s.exams_passed),
      s.avg_exam_score === null ? '' : String(s.avg_exam_score),
      s.top_cert || '',
    ]),
  ]

  return (
    <AdminPage
      props={props}
      title="Students"
      lead="Who is studying, where they are, and what they mostly do. Location is approximate (from their internet connection), unless the student chose their country in their profile."
    >
      <div className="cg-tools__tiles">
        <Tile n={totals.all} label="Students in total" />
        <Tile n={totals.practice} label="Mostly practice" />
        <Tile n={totals.exams} label="Mostly exam simulations" />
        <Tile n={totals.idle} label="Signed up, not started" />
      </div>

      {countries.length > 0 && (
        <div className="cg-tools__card">
          <strong>Where students are</strong>
          <div className="cg-tools__row" style={{ marginTop: 10 }}>
            {countries.slice(0, 30).map((c) => (
              <a
                key={c.country || 'unknown'}
                href={c.country ? `/admin/students?country=${c.country}` : '/admin/students'}
                className={`cg-tools__badge${country && c.country === country ? ' cg-tools__badge--blue' : ''}`}
                style={{ textDecoration: 'none' }}
              >
                {c.country ? countryName(c.country) : 'Unknown'} · {c.n}
              </a>
            ))}
          </div>
        </div>
      )}

      <form method="get" action="/admin/students" className="cg-tools__row" style={{ margin: '16px 0' }}>
        <label htmlFor="student-search" className="cg-tools__muted">
          Search
        </label>
        <input
          id="student-search"
          name="q"
          defaultValue={q}
          placeholder="Name or email"
          style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid var(--theme-elevation-250)', minWidth: 240, background: 'var(--theme-input-bg)', color: 'var(--theme-text)' }}
        />
        {country && <input type="hidden" name="country" value={country} />}
        <button type="submit" className="cg-tools__btn cg-tools__btn--primary">
          Search
        </button>
        {(q || country) && (
          <a href="/admin/students" className="cg-tools__btn">
            Clear filters
          </a>
        )}
        <span className="cg-tools__spacer" />
        <DownloadCsv rows={csvRows} fileName="certgenius-students.csv" label={`Download ${students.length} as spreadsheet (.csv)`} />
      </form>

      {students.length === 0 ? (
        <p className="cg-tools__muted">No students match.</p>
      ) : (
        <div className="cg-tools__card cg-tools__scroll">
          <table className="cg-tools__table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Location</th>
                <th>Mostly</th>
                <th>Answered</th>
                <th>Exams</th>
                <th>Most practised</th>
                <th>Last seen</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id}>
                  <td>
                    <a href={`/admin/students?id=${s.id}`}>
                      <strong>{s.name || '(no name)'}</strong>
                    </a>
                    <div className="cg-tools__muted">{s.email}</div>
                  </td>
                  <td>
                    {countryName(s.country) || '-'}
                    {s.city && <div className="cg-tools__muted">{s.city}</div>}
                  </td>
                  <td>
                    <Mostly s={s} />
                  </td>
                  <td>
                    {s.answers}
                    {s.answers > 0 && <div className="cg-tools__muted">{Math.round((100 * s.correct) / s.answers)}% correct</div>}
                  </td>
                  <td>
                    {s.exams_finished}
                    {s.avg_exam_score !== null && <div className="cg-tools__muted">avg {s.avg_exam_score}%</div>}
                  </td>
                  <td>{s.top_cert || '-'}</td>
                  <td>
                    {formatDate(s.last_seen) || '-'}
                    <div className="cg-tools__muted">joined {formatDate(s.joined)}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {students.length === 1000 && <p className="cg-tools__muted">Showing the 1,000 most recently active students. Use search to find others.</p>}
        </div>
      )}
    </AdminPage>
  )
}

function Mostly({ s }: { s: StudentRow }) {
  const text = mostlyDoing(s)
  const tone = text === 'Mostly exam simulations' ? 'cg-tools__badge--blue' : text.includes('ractice') ? 'cg-tools__badge--ok' : ''
  return (
    <>
      <span className={`cg-tools__badge ${tone}`}>{text}</span>
      <div className="cg-tools__muted">
        {s.practice_sessions} practice · {s.exams_started} exam{s.exams_started === 1 ? '' : 's'}
      </div>
    </>
  )
}

function Tile({ n, label }: { n: number; label: string }) {
  return (
    <div className="cg-tools__tile">
      <span className="cg-tools__num">{n.toLocaleString('en-GB')}</span>
      <span className="cg-tools__label">{label}</span>
    </div>
  )
}

function Detail({ detail }: { detail: NonNullable<Awaited<ReturnType<typeof studentDetail>>> }) {
  const s = detail.student
  return (
    <>
      <div className="cg-tools__tiles">
        <Info label="Email" value={s.email} />
        <Info label="Location" value={[s.city, countryName(s.country)].filter(Boolean).join(', ') || 'Unknown'} />
        <Info label="Joined" value={formatDate(s.joined)} />
        <Info label="Last seen" value={formatDate(s.last_seen) || '-'} />
        <Info label="Mostly" value={mostlyDoing(s)} />
        <Info label="Current streak" value={`${s.streak} day${s.streak === 1 ? '' : 's'}`} />
        <Info label="Questions answered" value={`${s.answers}${s.answers ? ` (${Math.round((100 * s.correct) / s.answers)}% correct)` : ''}`} />
        <Info
          label="Exam simulations"
          value={`${s.exams_finished} finished, ${s.exams_passed} passed${s.avg_exam_score !== null ? `, avg ${s.avg_exam_score}%` : ''}`}
        />
      </div>

      <h2 className="cg-tools__section">By certification</h2>
      {detail.perCert.length === 0 ? (
        <p className="cg-tools__muted">No activity yet.</p>
      ) : (
        <div className="cg-tools__card cg-tools__scroll">
          <table className="cg-tools__table">
            <thead>
              <tr>
                <th>Certification</th>
                <th>Answered</th>
                <th>Correct</th>
                <th>Practice sessions</th>
                <th>Exams finished</th>
                <th>Best exam score</th>
                <th>Last practised</th>
              </tr>
            </thead>
            <tbody>
              {detail.perCert.map((c) => (
                <tr key={c.title}>
                  <td>{c.title}</td>
                  <td>{c.answers}</td>
                  <td>{c.answers ? `${Math.round((100 * c.correct) / c.answers)}%` : '-'}</td>
                  <td>{c.practice}</td>
                  <td>{c.exams}</td>
                  <td>{c.best_score !== null ? `${c.best_score}%` : '-'}</td>
                  <td>{formatDate(c.last) || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="cg-tools__section">Recent sessions</h2>
      {detail.recent.length === 0 ? (
        <p className="cg-tools__muted">None yet.</p>
      ) : (
        <div className="cg-tools__card cg-tools__scroll">
          <table className="cg-tools__table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Certification</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {detail.recent.map((r, i) => (
                <tr key={i}>
                  <td>{formatDate(r.started_at)}</td>
                  <td>{r.mode === 'exam' ? 'Exam simulation' : 'Practice'}</td>
                  <td>{r.title}</td>
                  <td>
                    {r.mode === 'exam' && r.status === 'submitted' ? (
                      <span className={`cg-tools__badge ${r.passed ? 'cg-tools__badge--ok' : 'cg-tools__badge--bad'}`}>
                        {r.score_percent}% {r.passed ? 'passed' : 'failed'}
                      </span>
                    ) : r.status === 'in-progress' ? (
                      'In progress'
                    ) : r.status === 'submitted' ? (
                      'Finished'
                    ) : (
                      'Stopped'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p>
        <a className="cg-tools__btn" href={`/admin/collections/students/${s.id}`}>
          Open the student record
        </a>
      </p>
    </>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="cg-tools__tile">
      <span className="cg-tools__label">{label}</span>
      <span style={{ fontWeight: 700, fontSize: 15, wordBreak: 'break-word' }}>{value}</span>
    </div>
  )
}
