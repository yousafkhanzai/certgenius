'use client'

import { Button } from '@payloadcms/ui'
import Papa from 'papaparse'
import { readSheet } from 'read-excel-file/browser'
import React, { useState } from 'react'

import {
  CERT_COLUMNS,
  CERT_OPTIONAL_COLUMNS,
  CERT_SHEET_NAME,
  CERT_SHEET_OPTIONS,
  DOMAIN_COLUMNS,
  DOMAIN_SHEET_NAME,
  DOMAIN_SHEET_OPTIONS,
  IMPORT_BATCH_SIZE,
  PAGE_SHEETS,
  PAGE_SHEET_KEYS,
  QUESTION_COLUMNS,
  QUESTION_OPTIONAL_COLUMNS,
  checkCertHeader,
  checkDomainHeader,
  checkQuestionHeader,
  rowsFromSheet,
  type ImportRow,
  type PageBundle,
  type RowResult,
} from '@/import/columns'

type Kind = 'questions' | 'certifications' | 'domains'

const ENDPOINT: Record<Kind, string> = {
  questions: '/api/questions/import',
  certifications: '/api/certifications/import',
  domains: '/api/certifications/import-domains',
}

const STATUS_STYLE: Record<RowResult['status'], { label: string; color: string }> = {
  valid: { label: 'Ready', color: '#067647' },
  imported: { label: 'Imported', color: '#067647' },
  updated: { label: 'Updated', color: '#067647' },
  invalid: { label: 'Problem', color: '#B42318' },
  duplicate: { label: 'Duplicate', color: '#B54708' },
  exists: { label: 'Already exists', color: '#475467' },
}

// ---------- templates ----------

const csvLine = (cells: string[]) => cells.map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(',')

const TEMPLATES: Record<string, { file: string; type: string; text: string }> = {
  certifications: {
    file: 'certifications-template.csv',
    type: 'text/csv',
    text: [
      csvLine([...CERT_COLUMNS, ...CERT_OPTIONAL_COLUMNS]),
      csvLine([
        'Certified Ethereum Developer',
        'BC-CED',
        'Blockchain Council',
        'certified-ethereum-developer',
        'Blockchain',
        'Active',
        'Practise Ethereum architecture; Solidity; testing; Web3 integration and token standards.',
        '60',
        '100',
        '60',
        'Online proctored',
        'https://www.blockchain-council.org/',
      ]),
    ].join('\n'),
  },
  domains: {
    file: 'domains-template.csv',
    type: 'text/csv',
    text: [
      csvLine([...DOMAIN_COLUMNS]),
      csvLine(['certified-ethereum-developer', 'Ethereum Architecture and EVM', '20', 'https://certgenius.vercel.app/posts/ethereum-architecture-evm-gas']),
      csvLine(['certified-ethereum-developer', 'Solidity Programming Language', '25', 'https://certgenius.vercel.app/posts/solidity-fundamentals']),
    ].join('\n'),
  },
  questions: {
    file: 'questions-template.csv',
    type: 'text/csv',
    text: [
      csvLine([...QUESTION_COLUMNS, ...QUESTION_OPTIONAL_COLUMNS]),
      csvLine([
        'certified-ethereum-developer',
        'Solidity Programming Language',
        'Which keyword makes a Solidity function readable without changing state?',
        'pure',
        'view',
        'payable',
        'external',
        'B',
        'A view function can read state but cannot modify it.',
        'Think about reading versus writing.',
        'easy',
        'single',
        '/posts/solidity-fundamentals',
        'https://docs.soliditylang.org/',
        'pure cannot even read state.',
        'Correct: view reads state without changing it.',
        'payable is about receiving Ether.',
        'external is about who can call the function.',
      ]),
    ].join('\n'),
  },
  blog: {
    file: 'blog-template.md',
    type: 'text/markdown',
    text: `---
title: "Solidity Fundamentals for the Certified Ethereum Developer Exam"
slug: solidity-fundamentals
certification: certified-ethereum-developer
domain: Solidity Programming Language
excerpt: "One or two sentences shown in Google and on blog cards."
videoUrl: https://www.youtube.com/watch?v=VIDEO_ID
---

Your blog text starts here. Use ## for headings, **bold**, and - for lists.
`,
  },
}

// Ready-made Excel templates (built by src/scripts/make-templates.ts).
function TemplateLink({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} download className="btn btn--style-secondary btn--size-small" style={{ margin: 0, textDecoration: 'none' }}>
      {label}
    </a>
  )
}

function TemplateButton({ name, label }: { name: keyof typeof TEMPLATES; label: string }) {
  return (
    <Button
      buttonStyle="secondary"
      size="small"
      onClick={() => {
        const t = TEMPLATES[name]
        const url = URL.createObjectURL(new Blob([t.text], { type: t.type }))
        const a = document.createElement('a')
        a.href = url
        a.download = t.file
        a.click()
        URL.revokeObjectURL(url)
      }}
    >
      {label}
    </Button>
  )
}

// ---------- reading files ----------

const parseCsv = async (file: File) =>
  // Comma-delimited: the source files use semicolons inside text, so the
  // delimiter must not be auto-detected.
  Papa.parse<string[]>(await file.text(), { delimiter: ',', skipEmptyLines: 'greedy' }).data

const isCsv = (file: File) => file.name.toLowerCase().endsWith('.csv')

async function trySheet(file: File, name: string): Promise<unknown[][] | null> {
  try {
    return (await readSheet(file, name)) as unknown[][]
  } catch {
    return null
  }
}

async function readMainSheet(file: File, kind: Kind): Promise<unknown[][]> {
  if (isCsv(file)) return parseCsv(file)
  if (kind === 'certifications') {
    const sheet = (await trySheet(file, 'Certifications')) || (await trySheet(file, CERT_SHEET_NAME))
    if (!sheet) throw new Error(`Couldn't find a sheet named "Certifications" (or "${CERT_SHEET_NAME}") in this file.`)
    return sheet
  }
  if (kind === 'domains') return (await trySheet(file, DOMAIN_SHEET_NAME)) || ((await readSheet(file)) as unknown[][])
  return (await readSheet(file)) as unknown[][]
}

function parse(kind: Kind, sheet: unknown[][]) {
  const { header, rows } = rowsFromSheet(
    sheet,
    kind === 'certifications' ? CERT_SHEET_OPTIONS : kind === 'domains' ? DOMAIN_SHEET_OPTIONS : {},
  )
  const problem = kind === 'questions' ? checkQuestionHeader(header) : kind === 'domains' ? checkDomainHeader(header) : checkCertHeader(header)
  if (problem) throw new Error(problem)
  return rows
}

// The certification workbook's optional page-content sheets, grouped per
// certification. Returns [] when the file has none of them.
async function readPageBundles(file: File): Promise<PageBundle[]> {
  const bySlug = new Map<string, PageBundle>()
  for (const key of PAGE_SHEET_KEYS) {
    const sheet = await trySheet(file, PAGE_SHEETS[key].sheet)
    if (!sheet) continue
    const { header, rows } = rowsFromSheet(sheet)
    if (!header.includes('certification_slug')) {
      throw new Error(`Sheet "${PAGE_SHEETS[key].sheet}": the first column must be certification_slug.`)
    }
    for (const r of rows) {
      const slug = r.values.certification_slug
      if (!slug) continue
      if (!bySlug.has(slug)) bySlug.set(slug, { slug, page: [], plan: [], compare: [], resources: [], courses: [], faqs: [] })
      ;(bySlug.get(slug) as PageBundle)[key].push(r.values)
    }
  }
  return [...bySlug.values()]
}

async function postPages(bundles: PageBundle[], extra: Record<string, unknown>, onProgress: (t: string) => void, verb: string) {
  const out: RowResult[] = []
  for (let i = 0; i < bundles.length; i += 20) {
    onProgress(`${verb} page content ${Math.min(i + 20, bundles.length)} of ${bundles.length}...`)
    const res = await fetch('/api/certifications/import-page', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bundles: bundles.slice(i, i + 20), ...extra }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json.error || `Server error (${res.status})`)
    out.push(...(json.results as RowResult[]).map((r, n) => ({ ...r, row: i + n + 1 })))
  }
  return out
}

async function postBatch(kind: Kind, rows: ImportRow[], extra: Record<string, unknown>): Promise<RowResult[]> {
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

async function runBatches(
  kind: Kind,
  items: ImportRow[],
  extra: Record<string, unknown>,
  onProgress: (text: string) => void,
  verb: string,
) {
  const all: RowResult[] = []
  const seenKeys = new Set<string>()
  for (let i = 0; i < items.length; i += IMPORT_BATCH_SIZE) {
    onProgress(`${verb} ${Math.min(i + IMPORT_BATCH_SIZE, items.length)} of ${items.length} rows...`)
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

// ---------- report ----------

function Summary({ results }: { results: RowResult[] }) {
  const counts = results.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1
    return acc
  }, {})
  return (
    <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', margin: '1rem 0' }}>
      {Object.entries(counts).map(([status, n]) => (
        <div key={status}>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: STATUS_STYLE[status as RowResult['status']].color }}>{n}</div>
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
          Rows with notes or problems
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

const cardStyle: React.CSSProperties = {
  border: '1px solid var(--theme-elevation-150)',
  borderRadius: '14px',
  padding: '1.5rem',
  marginBottom: '2rem',
}

const codeStyle: React.CSSProperties = {
  background: 'var(--theme-elevation-50)',
  borderRadius: '10px',
  padding: '0.75rem 1rem',
  fontSize: '0.85rem',
  overflowX: 'auto',
  whiteSpace: 'pre-wrap',
}

// ---------- spreadsheet cards ----------

const HELP: Record<Kind, React.ReactNode> = {
  certifications: (
    <>
      <p style={{ opacity: 0.8 }}>
        Excel (.xlsx) or .csv. Sheet <strong>&ldquo;Certifications&rdquo;</strong> (or &ldquo;{CERT_SHEET_NAME}&rdquo;) with
        columns:
      </p>
      <pre style={codeStyle}>
        {`Required: ${CERT_COLUMNS.join(', ')}
Optional: ${CERT_OPTIONAL_COLUMNS.join(', ')}`}
      </pre>
      <p style={{ opacity: 0.8 }}>
        The same workbook may also have these sheets, all imported in one step (each row starts with certification_slug):
      </p>
      <pre style={codeStyle}>
        {`Domains      ${DOMAIN_COLUMNS.slice(1).join(', ')}
${PAGE_SHEET_KEYS.map((k) => `${PAGE_SHEETS[k].sheet.padEnd(12)} ${PAGE_SHEETS[k].columns.slice(1).join(', ')}`).join('\n')}`}
      </pre>
      <p style={{ opacity: 0.8 }}>
        Easiest: download the Excel template, which has every sheet with an example. In &ldquo;Page&rdquo;, separate several roles
        or related certifications with <strong>|</strong>. A list sheet (Study plan, Compare, Resources, Courses, FAQs) replaces
        that certification&apos;s list on the site; leave a sheet out to keep what is there. Certifications are saved as{' '}
        <strong>drafts</strong>; for a live certification, press <strong>Publish changes</strong> on Certification health.
      </p>
    </>
  ),
  domains: (
    <>
      <p style={{ opacity: 0.8 }}>
        Add or update domains on their own (any time). Excel (.xlsx, sheet &ldquo;Domains&rdquo; or the first sheet) or .csv, one
        row per domain:
      </p>
      <pre style={codeStyle}>{`${DOMAIN_COLUMNS.join(', ')}
(weight and blog_post_url may be blank)`}</pre>
      <p style={{ opacity: 0.8 }}>
        Domains are <strong>added or updated, never removed</strong>. A blog link is attached straight away if that blog already
        exists; otherwise the blog attaches itself when you upload it below.
      </p>
    </>
  ),
  questions: (
    <>
      <p style={{ opacity: 0.8 }}>Excel (.xlsx) or .csv with these columns in this exact order:</p>
      <pre style={codeStyle}>{`${QUESTION_COLUMNS.join(', ')}
then optionally: ${QUESTION_OPTIONAL_COLUMNS.join(', ')}`}</pre>
      <p style={{ opacity: 0.8 }}>
        The certification must exist. Questions may be uploaded <strong>before or after</strong> their domains: a question whose
        domain doesn&apos;t exist yet is saved but stays hidden from students until a domain with exactly that name is added.
      </p>
    </>
  ),
}

const TITLES: Record<Kind, string> = {
  certifications: '1. Certifications (with domains)',
  domains: '2. Domains only',
  questions: '4. Practice questions',
}

function ImportCard({ kind }: { kind: Kind }) {
  const [fileName, setFileName] = useState('')
  const [rows, setRows] = useState<ImportRow[]>([])
  const [results, setResults] = useState<RowResult[] | null>(null)
  // Certifications workbook: the optional "Domains" sheet.
  const [domainRows, setDomainRows] = useState<ImportRow[]>([])
  const [domainResults, setDomainResults] = useState<RowResult[] | null>(null)
  // ...and its optional page-content sheets (Page, Study plan, Compare, ...).
  const [pageBundles, setPageBundles] = useState<PageBundle[]>([])
  const [pageResults, setPageResults] = useState<RowResult[] | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const [done, setDone] = useState(false)
  const [updateExisting, setUpdateExisting] = useState(false)

  const onFile = async (file: File | undefined) => {
    setError('')
    setResults(null)
    setDomainResults(null)
    setPageResults(null)
    setPageBundles([])
    setDone(false)
    setRows([])
    setDomainRows([])
    if (!file) return
    setFileName(file.name)
    try {
      setBusy('Reading file...')
      const parsed = parse(kind, await readMainSheet(file, kind))
      if (!parsed.length) throw new Error('The file has a header row but no data rows.')
      setRows(parsed)
      const checked = await runBatches(kind, parsed, { commit: false }, setBusy, 'Checking')
      setResults(checked)

      if (kind === 'certifications' && !isCsv(file)) {
        const sheet = await trySheet(file, DOMAIN_SHEET_NAME)
        if (sheet) {
          const dRows = parse('domains', sheet)
          setDomainRows(dRows)
          if (dRows.length) {
            // Certifications from this file that will be created first.
            const pending = checked.filter((r) => r.status === 'valid' && r.key).map((r) => r.key as string)
            setDomainResults(await runBatches('domains', dRows, { commit: false, pending }, setBusy, 'Checking domains'))
          }
        }
        const bundles = await readPageBundles(file)
        setPageBundles(bundles)
        if (bundles.length) {
          const pending = checked.filter((r) => r.status === 'valid' && r.key).map((r) => r.key as string)
          setPageResults(await postPages(bundles, { commit: false, pending }, setBusy, 'Checking'))
        }
      }
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
  const importableDomains = domainResults
    ? domainRows.filter((row) => domainResults.find((x) => x.row === row.row)?.status === 'valid')
    : []

  const onImport = async () => {
    setError('')
    try {
      if (importable.length) {
        const outcome = await runBatches(kind, importable, { commit: true, updateExisting }, setBusy, 'Importing')
        const byRow = new Map(outcome.map((r) => [r.row, r]))
        setResults((prev) => (prev || []).map((r) => byRow.get(r.row) || r))
      }
      if (importableDomains.length) {
        const outcome = await runBatches('domains', importableDomains, { commit: true }, setBusy, 'Importing domains')
        const byRow = new Map(outcome.map((r) => [r.row, r]))
        setDomainResults((prev) => (prev || []).map((r) => byRow.get(r.row) || r))
      }
      if (importablePages.length) {
        const outcome = await postPages(importablePages, { commit: true }, setBusy, 'Importing')
        const bySlug = new Map(outcome.map((r) => [r.label, r]))
        setPageResults((prev) => (prev || []).map((r) => ({ ...(bySlug.get(r.label) || r), row: r.row })))
      }
      setDone(true)
    } catch (err) {
      setError(
        `${err instanceof Error ? err.message : 'Import failed.'} Rows already imported are saved; you can safely run the import again - existing items are skipped.`,
      )
    } finally {
      setBusy('')
    }
  }

  const importablePages = pageResults ? pageBundles.filter((b) => pageResults.find((r) => r.label === b.slug)?.status === 'valid') : []
  const total = importable.length + importableDomains.length + importablePages.length

  return (
    <section style={cardStyle}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>{TITLES[kind]}</h2>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {kind === 'certifications' ? (
            <TemplateLink href="/templates/certgenius-certification-template.xlsx" label="Download Excel template (all sheets)" />
          ) : kind === 'questions' ? (
            <TemplateLink href="/templates/certgenius-questions-template.xlsx" label="Download Excel template" />
          ) : (
            <TemplateButton name={kind} label="Download domains template (.csv)" />
          )}
        </div>
      </div>
      {HELP[kind]}

      <label style={{ display: 'block', margin: '1rem 0' }}>
        <span style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Choose a file</span>
        <input type="file" accept=".xlsx,.csv" disabled={Boolean(busy)} onChange={(e) => onFile(e.target.files?.[0])} />
      </label>

      {kind === 'certifications' && (
        <label style={{ display: 'block', margin: '1rem 0' }}>
          <input type="checkbox" checked={updateExisting} onChange={(e) => setUpdateExisting(e.target.checked)} /> Also update
          certifications that already exist (exam code, vendor, category, status and any optional columns filled in; saved as
          drafts for you to publish)
        </label>
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
            <Button buttonStyle="primary" disabled={total === 0} onClick={onImport}>
              {total
                ? `Import ${importable.length ? `${importable.length} ${kind === 'certifications' ? 'certification' : kind === 'domains' ? 'domain' : 'question'} row${importable.length === 1 ? '' : 's'}` : ''}${
                    importable.length && importableDomains.length ? ' and ' : ''
                  }${importableDomains.length ? `${importableDomains.length} domain row${importableDomains.length === 1 ? '' : 's'}` : ''}${
                    importablePages.length ? ` + page content for ${importablePages.length} certification${importablePages.length === 1 ? '' : 's'}` : ''
                  }`
                : 'Nothing to import'}
            </Button>
          )}
          <ResultTable results={results} />
          {domainResults && (
            <>
              <h3 style={{ marginBottom: 0 }}>&ldquo;Domains&rdquo; sheet</h3>
              <Summary results={domainResults} />
              <ResultTable results={domainResults} />
            </>
          )}
          {pageResults && (
            <>
              <h3 style={{ marginBottom: 0 }}>Page content (Page, Study plan, Compare, Resources, Courses, FAQs sheets)</h3>
              <Summary results={pageResults} />
              <ResultTable results={pageResults} />
            </>
          )}
        </>
      )}
    </section>
  )
}

// ---------- blogs ----------

function BlogImportCard() {
  const [files, setFiles] = useState<{ name: string; text: string }[]>([])
  const [results, setResults] = useState<RowResult[] | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const [done, setDone] = useState(false)
  const [publish, setPublish] = useState(true)
  const [updateExisting, setUpdateExisting] = useState(false)

  const send = async (payload: { files: { name: string; text: string }[]; commit: boolean; publish?: boolean; updateExisting?: boolean }) => {
    const res = await fetch('/api/posts/import-markdown', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
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
      setResults(await send({ files: read, commit: false }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read these files.')
    } finally {
      setBusy('')
    }
  }

  const importable = (results || []).filter((r) => r.status === 'valid' || (updateExisting && r.status === 'exists')).length

  return (
    <section style={cardStyle}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>3. Study-guide blogs</h2>
        <TemplateButton name="blog" label="Download blog template" />
      </div>
      <p style={{ opacity: 0.8 }}>
        One blog per domain, covering all of that domain&apos;s questions. Markdown (.md) files that start with this header
        (videoUrl is optional):
      </p>
      <pre style={codeStyle}>{TEMPLATES.blog.text}</pre>
      <p style={{ opacity: 0.8 }}>
        The certification and the domain must already exist, and the domain name must match exactly. Importing creates the blog
        and attaches it to that domain.
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
          <input type="checkbox" checked={updateExisting} onChange={(e) => setUpdateExisting(e.target.checked)} /> Replace blogs
          that already exist (same slug) with the uploaded text
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
                  setResults(await send({ files, commit: true, publish, updateExisting }))
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
      <section style={{ background: 'var(--theme-elevation-50)', borderRadius: '14px', padding: '1.25rem 1.5rem', marginBottom: '2rem' }}>
        <h2 style={{ marginTop: 0, fontSize: '1.1rem' }}>Adding a certification, step by step</h2>
        <ol style={{ margin: 0, paddingLeft: '1.25rem', lineHeight: 1.7 }}>
          <li>
            <strong>Certifications with domains:</strong> one workbook with a &ldquo;Certifications&rdquo; sheet and a
            &ldquo;Domains&rdquo; sheet (card 1). Domains can also be added later on their own (card 2).
          </li>
          <li>
            <strong>Blogs:</strong> one per domain (card 3).
          </li>
          <li>
            <strong>Questions:</strong> any time - before or after the domains and blogs (card 4).
          </li>
          <li>
            <strong>Publish</strong> from <a href="/admin/health">Certification health</a> once every domain has questions and a
            published blog. Drafts never show on the site.
          </li>
        </ol>
      </section>
      <ImportCard kind="certifications" />
      <ImportCard kind="domains" />
      <BlogImportCard />
      <ImportCard kind="questions" />
    </>
  )
}
