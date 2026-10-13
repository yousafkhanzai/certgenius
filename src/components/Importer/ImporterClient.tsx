'use client'

import { Button } from '@payloadcms/ui'
import Papa from 'papaparse'
import { readSheet } from 'read-excel-file/browser'
import React, { useState } from 'react'

import {
  CERT_SHEET_NAME,
  CERT_SHEET_OPTIONS,
  IMPORT_BATCH_SIZE,
  checkCertHeader,
  checkQuestionHeader,
  rowsFromSheet,
  type ImportRow,
  type RowResult,
} from '@/import/columns'

type Kind = 'questions' | 'certifications'

const ENDPOINT: Record<Kind, string> = {
  questions: '/api/questions/import',
  certifications: '/api/certifications/import',
}

const STATUS_STYLE: Record<RowResult['status'], { label: string; color: string }> = {
  valid: { label: 'Ready', color: '#067647' },
  imported: { label: 'Imported', color: '#067647' },
  updated: { label: 'Updated', color: '#067647' },
  invalid: { label: 'Problem', color: '#B42318' },
  duplicate: { label: 'Duplicate', color: '#B54708' },
  exists: { label: 'Already exists', color: '#475467' },
}

async function readFile(file: File, kind: Kind): Promise<unknown[][]> {
  if (file.name.toLowerCase().endsWith('.csv')) {
    const text = await file.text()
    // Comma-delimited: the source files use semicolons inside text, so the
    // delimiter must not be auto-detected.
    const parsed = Papa.parse<string[]>(text, { delimiter: ',', skipEmptyLines: 'greedy' })
    return parsed.data
  }
  if (kind === 'certifications') {
    try {
      return (await readSheet(file, CERT_SHEET_NAME)) as unknown[][]
    } catch {
      throw new Error(`Couldn't find a sheet named "${CERT_SHEET_NAME}" in this file.`)
    }
  }
  return (await readSheet(file)) as unknown[][]
}

async function postBatch(
  kind: Kind,
  rows: ImportRow[],
  extra: Record<string, boolean>,
): Promise<RowResult[]> {
  const res = await fetch(ENDPOINT[kind], {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rows, ...extra }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || `Server error (${res.status})`)
  return json.results as RowResult[]
}

function Summary({ results }: { results: RowResult[] }) {
  const counts = results.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1
    return acc
  }, {})
  return (
    <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', margin: '1rem 0' }}>
      {Object.entries(counts).map(([status, n]) => (
        <div key={status}>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: STATUS_STYLE[status as RowResult['status']].color }}>
            {n}
          </div>
          <div style={{ opacity: 0.75 }}>{STATUS_STYLE[status as RowResult['status']].label}</div>
        </div>
      ))}
    </div>
  )
}

function ResultTable({ results }: { results: RowResult[] }) {
  const [filter, setFilter] = useState<'problems' | 'all'>('problems')
  const shown = (filter === 'problems' ? results.filter((r) => r.problems.length) : results).slice(0, 500)
  return (
    <div>
      <div style={{ display: 'flex', gap: '0.5rem', margin: '0.5rem 0' }}>
        <Button buttonStyle={filter === 'problems' ? 'primary' : 'secondary'} size="small" onClick={() => setFilter('problems')}>
          Rows with problems
        </Button>
        <Button buttonStyle={filter === 'all' ? 'primary' : 'secondary'} size="small" onClick={() => setFilter('all')}>
          All rows (preview)
        </Button>
      </div>
      {shown.length === 0 ? (
        <p style={{ opacity: 0.75 }}>Nothing to show.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--theme-elevation-150)' }}>
                <th style={{ padding: '0.5rem' }}>Row</th>
                <th style={{ padding: '0.5rem' }}>Status</th>
                <th style={{ padding: '0.5rem' }}>Item</th>
                <th style={{ padding: '0.5rem' }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.row} style={{ borderBottom: '1px solid var(--theme-elevation-100)', verticalAlign: 'top' }}>
                  <td style={{ padding: '0.5rem' }}>{r.row}</td>
                  <td style={{ padding: '0.5rem', color: STATUS_STYLE[r.status].color, fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {STATUS_STYLE[r.status].label}
                  </td>
                  <td style={{ padding: '0.5rem', maxWidth: '28rem' }}>{r.label}</td>
                  <td style={{ padding: '0.5rem' }}>{r.problems.join('; ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {results.length > 500 && <p style={{ opacity: 0.75 }}>Showing the first 500 rows.</p>}
        </div>
      )}
    </div>
  )
}

function ImportCard({ kind }: { kind: Kind }) {
  const [fileName, setFileName] = useState('')
  const [rows, setRows] = useState<ImportRow[]>([])
  const [results, setResults] = useState<RowResult[] | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const [done, setDone] = useState(false)
  const publish = false // certifications are always imported as drafts (publishing rule)
  const [updateExisting, setUpdateExisting] = useState(false)

  const runBatches = async (items: ImportRow[], extra: Record<string, boolean>, verb: string) => {
    const all: RowResult[] = []
    const seenKeys = new Set<string>()
    for (let i = 0; i < items.length; i += IMPORT_BATCH_SIZE) {
      setBusy(`${verb} ${Math.min(i + IMPORT_BATCH_SIZE, items.length)} of ${items.length} rows...`)
      const batch = await postBatch(kind, items.slice(i, i + IMPORT_BATCH_SIZE), extra)
      // Catch duplicates that are split across two batches.
      for (const r of batch) {
        if (r.key && r.status === 'valid') {
          if (seenKeys.has(r.key)) {
            r.status = 'duplicate'
            r.problems.push('same item appears earlier in this file')
          }
          seenKeys.add(r.key)
        }
        all.push(r)
      }
    }
    return all
  }

  const onFile = async (file: File | undefined) => {
    setError('')
    setResults(null)
    setDone(false)
    setRows([])
    if (!file) return
    setFileName(file.name)
    try {
      setBusy('Reading file...')
      const sheet = await readFile(file, kind)
      const { header, rows: parsed } = rowsFromSheet(
        sheet,
        kind === 'certifications' ? CERT_SHEET_OPTIONS : {},
      )
      const headerProblem = kind === 'questions' ? checkQuestionHeader(header) : checkCertHeader(header)
      if (headerProblem) throw new Error(headerProblem)
      if (!parsed.length) throw new Error('The file has a header row but no data rows.')
      setRows(parsed)
      setResults(await runBatches(parsed, { commit: false }, 'Checking'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read this file.')
    } finally {
      setBusy('')
    }
  }

  const importable = results
    ? rows.filter((row) => {
        const r = results.find((x) => x.row === row.row)
        return r?.status === 'valid' || (updateExisting && r?.status === 'exists')
      })
    : []

  const onImport = async () => {
    setError('')
    try {
      const outcome = await runBatches(importable, { commit: true, publish, updateExisting }, 'Importing')
      const byRow = new Map(outcome.map((r) => [r.row, r]))
      setResults((prev) => (prev || []).map((r) => byRow.get(r.row) || r))
      setDone(true)
    } catch (err) {
      setError(
        `${err instanceof Error ? err.message : 'Import failed.'} Rows already imported are saved; you can safely run the import again - existing items are skipped.`,
      )
    } finally {
      setBusy('')
    }
  }

  return (
    <section
      style={{
        border: '1px solid var(--theme-elevation-150)',
        borderRadius: '14px',
        padding: '1.5rem',
        marginBottom: '2rem',
      }}
    >
      <h2 style={{ marginTop: 0 }}>{kind === 'questions' ? 'Practice questions' : 'Certifications'}</h2>
      <p style={{ opacity: 0.75 }}>
        {kind === 'questions'
          ? 'Excel (.xlsx) or .csv with columns: certification_slug, domain_name, question_text, option_a-d, correct_answer, explanation, hint, difficulty, question_type, blog_post_url, reference_url, then optionally why_a-why_d. The certification and its domains must already exist.'
          : `Excel (.xlsx, sheet "${CERT_SHEET_NAME}") or .csv with columns: name, exam code, vendor, slug, category, status. Retired and On hold certifications are imported but hidden from listings.`}
      </p>

      <label style={{ display: 'block', margin: '1rem 0' }}>
        <span style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Choose a file</span>
        <input
          type="file"
          accept=".xlsx,.csv"
          disabled={Boolean(busy)}
          onChange={(e) => onFile(e.target.files?.[0])}
        />
      </label>

      {kind === 'certifications' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', margin: '1rem 0' }}>
          <p style={{ margin: 0, opacity: 0.75 }}>
            Imported certifications are always saved as <strong>drafts</strong>. A certification can only be published once
            it has domains, every domain has questions, and every domain has a published blog.
          </p>
          <label>
            <input type="checkbox" checked={updateExisting} onChange={(e) => setUpdateExisting(e.target.checked)} />{' '}
            Update exam code, vendor, category and status of certifications that already exist (saved as drafts
            for you to publish)
          </label>
        </div>
      )}

      {busy && <p style={{ fontWeight: 600 }}>{busy}</p>}
      {error && (
        <p role="alert" style={{ color: '#B42318', fontWeight: 600 }}>
          {error}
        </p>
      )}

      {results && !busy && (
        <>
          <h3 style={{ marginBottom: 0 }}>{done ? 'Import finished' : `Validation report for ${fileName}`}</h3>
          <Summary results={results} />
          {!done && (
            <Button buttonStyle="primary" disabled={importable.length === 0} onClick={onImport}>
              {importable.length
                ? `Import ${importable.length} valid row${importable.length === 1 ? '' : 's'}`
                : 'Nothing to import'}
            </Button>
          )}
          <ResultTable results={results} />
        </>
      )}
    </section>
  )
}

// Study-guide blogs: one Markdown file per domain.
function BlogImportCard() {
  const [files, setFiles] = useState<{ name: string; text: string }[]>([])
  const [results, setResults] = useState<RowResult[] | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const [done, setDone] = useState(false)
  const [publish, setPublish] = useState(true)
  const [updateExisting, setUpdateExisting] = useState(false)

  const send = async (commit: boolean) => {
    const res = await fetch('/api/posts/import-markdown', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ files, commit, publish, updateExisting }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json.error || `Server error (${res.status})`)
    return json.results as RowResult[]
  }

  const onFiles = async (list: FileList | null) => {
    setError('')
    setResults(null)
    setDone(false)
    if (!list || list.length === 0) return
    try {
      setBusy('Reading files...')
      const read = await Promise.all([...list].map(async (f) => ({ name: f.name, text: await f.text() })))
      setFiles(read)
      setBusy('Checking...')
      const res = await fetch('/api/posts/import-markdown', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: read, commit: false }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || `Server error (${res.status})`)
      setResults(json.results)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read these files.')
    } finally {
      setBusy('')
    }
  }

  const importable = (results || []).filter((r) => r.status === 'valid' || (updateExisting && r.status === 'exists')).length

  return (
    <section
      style={{ border: '1px solid var(--theme-elevation-150)', borderRadius: '14px', padding: '1.5rem', marginBottom: '2rem' }}
    >
      <h2 style={{ marginTop: 0 }}>Study-guide blogs</h2>
      <p style={{ opacity: 0.75 }}>
        One blog per domain, covering all of that domain&apos;s questions. Upload Markdown (.md) files that start with this header:
      </p>
      <pre
        style={{
          background: 'var(--theme-elevation-50)',
          borderRadius: '10px',
          padding: '0.75rem 1rem',
          fontSize: '0.85rem',
          overflowX: 'auto',
        }}
      >
        {`---
title: "Solidity Fundamentals for the Certified Ethereum Developer Exam"
slug: solidity-fundamentals
certification: certified-ethereum-developer
domain: Solidity Programming Language
excerpt: "One or two sentences shown in Google and on blog cards."
---

Your blog text starts here. Use ## for headings, **bold**, and - for lists.`}
      </pre>
      <p style={{ opacity: 0.75 }}>
        The certification and the domain must already exist, and the domain name must match exactly. Importing creates the
        blog post and attaches it to that domain, so practice, results and bookmarks link to it.
      </p>

      <label style={{ display: 'block', margin: '1rem 0' }}>
        <span style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Choose one or more .md files</span>
        <input type="file" accept=".md,.markdown,.txt" multiple disabled={Boolean(busy)} onChange={(e) => onFiles(e.target.files)} />
      </label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', margin: '1rem 0' }}>
        <label>
          <input type="checkbox" checked={publish} onChange={(e) => setPublish(e.target.checked)} /> Publish the blogs straight
          away (untick to save them as drafts)
        </label>
        <label>
          <input type="checkbox" checked={updateExisting} onChange={(e) => setUpdateExisting(e.target.checked)} /> Replace
          blogs that already exist (same slug) with the uploaded text
        </label>
      </div>

      {busy && <p style={{ fontWeight: 600 }}>{busy}</p>}
      {error && (
        <p role="alert" style={{ color: '#B42318', fontWeight: 600 }}>
          {error}
        </p>
      )}
      {results && !busy && (
        <>
          <h3 style={{ marginBottom: 0 }}>{done ? 'Import finished' : 'Validation report'}</h3>
          <Summary results={results} />
          {!done && (
            <Button
              buttonStyle="primary"
              disabled={importable === 0}
              onClick={async () => {
                setError('')
                setBusy('Importing...')
                try {
                  setResults(await send(true))
                  setDone(true)
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Import failed.')
                } finally {
                  setBusy('')
                }
              }}
            >
              {importable ? `Import ${importable} blog${importable === 1 ? '' : 's'}` : 'Nothing to import'}
            </Button>
          )}
          <ResultTable results={results} />
        </>
      )}
    </section>
  )
}

export function ImporterClient() {
  return (
    <>
      <section
        style={{
          background: 'var(--theme-elevation-50)',
          borderRadius: '14px',
          padding: '1.25rem 1.5rem',
          marginBottom: '2rem',
        }}
      >
        <h2 style={{ marginTop: 0, fontSize: '1.1rem' }}>Adding a certification, step by step</h2>
        <ol style={{ margin: 0, paddingLeft: '1.25rem', lineHeight: 1.7 }}>
          <li>
            <strong>Create the certification</strong> under <a href="/admin/collections/certifications">Certifications</a> (or
            import the list below), and add its <strong>domains</strong> with their weights on the &ldquo;Domains&rdquo; tab.
          </li>
          <li>
            <strong>Upload one blog per domain</strong> in &ldquo;Study-guide blogs&rdquo; below.
          </li>
          <li>
            <strong>Upload the questions</strong> in &ldquo;Practice questions&rdquo; below. Each question&apos;s domain name must match
            one of the certification&apos;s domains.
          </li>
          <li>
            <strong>Publish the certification</strong> when its questions and blogs are ready. Drafts never show on the site.
          </li>
        </ol>
      </section>
      <ImportCard kind="certifications" />
      <BlogImportCard />
      <ImportCard kind="questions" />
    </>
  )
}
