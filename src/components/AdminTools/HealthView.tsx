import type { AdminViewServerProps } from 'payload'

import React from 'react'

import { certificationHealth } from '@/admin/data'
import { ActionButton } from './ActionButton'
import { AdminPage, formatDate, isAdmin } from './AdminPage'

// Admin page at /admin/health - every certification with a checklist of
// what it still needs before it can be published (HARD RULE), plus a
// Publish / Unpublish button.
export default async function HealthView(props: AdminViewServerProps) {
  const certs = isAdmin(props) ? await certificationHealth(props.initPageResult.req.payload) : []
  const live = certs.filter((c) => c.published)
  const ready = certs.filter((c) => !c.published && c.blockers.length === 0)
  const notReady = certs.filter((c) => !c.published && c.blockers.length > 0)

  return (
    <AdminPage
      props={props}
      title="Certification health board"
      lead="Every certification and what it still needs. A certification can be published only when it has domains, every domain has questions, and every domain has a published blog."
    >
      <div className="cg-tools__tiles">
        <Tile n={live.length} label="Live on the site" />
        <Tile n={ready.length} label="Ready to publish" />
        <Tile n={notReady.length} label="Still missing something" />
      </div>

      {ready.length > 0 && <Group title="Ready to publish" certs={ready} />}
      {live.length > 0 && <Group title="Live on the site" certs={live} />}
      {notReady.length > 0 && <Group title="Not ready yet" certs={notReady} />}
      {certs.length === 0 && <p>No certifications yet. Add one, or import them from a spreadsheet.</p>}
    </AdminPage>
  )
}

function Tile({ n, label }: { n: number; label: string }) {
  return (
    <div className="cg-tools__tile">
      <span className="cg-tools__num">{n}</span>
      <span className="cg-tools__label">{label}</span>
    </div>
  )
}

function Group({ title, certs }: { title: string; certs: Awaited<ReturnType<typeof certificationHealth>> }) {
  return (
    <>
      <h2 className="cg-tools__section">{title}</h2>
      {certs.map((c) => (
        <details key={c.id} className="cg-tools__card" open={!c.published && c.blockers.length === 0}>
          <summary style={{ cursor: 'pointer', listStyle: 'none' }}>
            <span className="cg-tools__row">
              <strong style={{ fontSize: 16 }}>{c.title}</strong>
              {c.published ? (
                <span className="cg-tools__badge cg-tools__badge--ok">Live</span>
              ) : c.blockers.length ? (
                <span className="cg-tools__badge cg-tools__badge--bad">
                  {c.blockers.length} missing
                </span>
              ) : (
                <span className="cg-tools__badge cg-tools__badge--blue">Ready</span>
              )}
              {c.examStatus && <span className="cg-tools__badge">{c.examStatus}</span>}
              <span className="cg-tools__spacer" />
              <span className="cg-tools__muted">
                {c.domains.length} domain{c.domains.length === 1 ? '' : 's'} · {c.totalQuestions} question
                {c.totalQuestions === 1 ? '' : 's'} · updated {formatDate(c.updatedAt)}
              </span>
            </span>
          </summary>

          <div style={{ marginTop: 12 }}>
            <p className="cg-tools__muted" style={{ margin: '0 0 6px' }}>
              {[c.vendor, c.category].filter(Boolean).join(' · ') || 'No vendor or category yet'}
            </p>

            {c.domains.length > 0 && (
              <div className="cg-tools__scroll">
                <table className="cg-tools__table">
                  <thead>
                    <tr>
                      <th>Domain</th>
                      <th>Weight</th>
                      <th>Questions</th>
                      <th>Blog</th>
                    </tr>
                  </thead>
                  <tbody>
                    {c.domains.map((d) => (
                      <tr key={d.name}>
                        <td>{d.name}</td>
                        <td>{d.weight !== null ? `${d.weight}%` : '-'}</td>
                        <td>
                          {d.questions ? (
                            <span className="cg-tools__badge cg-tools__badge--ok">✓ {d.questions}</span>
                          ) : (
                            <span className="cg-tools__badge cg-tools__badge--bad">✗ none</span>
                          )}
                        </td>
                        <td>
                          {!d.guide ? (
                            <span className="cg-tools__badge cg-tools__badge--bad">✗ no blog</span>
                          ) : (
                            <a href={`/admin/collections/posts/${d.guide.id}`}>
                              <span className={`cg-tools__badge ${d.guide.published ? 'cg-tools__badge--ok' : 'cg-tools__badge--warn'}`}>
                                {d.guide.published ? '✓ published' : '! draft'}
                              </span>{' '}
                              {d.guide.title}
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {c.blockers.length > 0 && (
              <>
                <p style={{ margin: '14px 0 0', fontWeight: 700, color: '#B42318' }}>Needed before publishing</p>
                <ul className="cg-tools__list">
                  {c.blockers.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              </>
            )}
            {c.tips.length > 0 && (
              <>
                <p style={{ margin: '14px 0 0', fontWeight: 700, color: '#B54708' }}>Recommended</p>
                <ul className="cg-tools__list">
                  {c.tips.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </>
            )}

            <div className="cg-tools__row" style={{ marginTop: 16 }}>
              <a className="cg-tools__btn" href={`/admin/collections/certifications/${c.id}`}>
                Edit certification
              </a>
              <a
                className="cg-tools__btn"
                href={`/admin/collections/questions?where[certification][equals]=${c.id}`}
              >
                See its questions
              </a>
              {c.published && c.slug && (
                <a className="cg-tools__btn" href={`/certifications/${c.slug}`} target="_blank" rel="noreferrer">
                  View on site
                </a>
              )}
              <span className="cg-tools__spacer" />
              {c.published ? (
                <ActionButton
                  endpoint="certification-status"
                  payload={{ id: c.id, publish: false }}
                  label="Unpublish"
                  busyLabel="Unpublishing…"
                  variant="danger"
                  confirm={`Unpublish "${c.title}"? It disappears from the website until you publish it again. Nothing is deleted.`}
                />
              ) : (
                c.blockers.length === 0 && (
                  <ActionButton
                    endpoint="certification-status"
                    payload={{ id: c.id, publish: true }}
                    label="Publish"
                    busyLabel="Publishing…"
                    variant="primary"
                    confirm={`Publish "${c.title}" on the website?`}
                  />
                )
              )}
            </div>
          </div>
        </details>
      ))}
    </>
  )
}
