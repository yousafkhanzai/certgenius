import { addDataAndFileToRequest, type Endpoint, type PayloadRequest } from 'payload'

import { isAdminUser } from '@/access/roles'
import {
  CERT_COLUMNS,
  IMPORT_BATCH_SIZE,
  QUESTION_COLUMNS,
  QUESTION_OPTIONAL_COLUMNS,
  type ImportRow,
  type RowResult,
} from './columns'
import { MAX_BLOG_BYTES, MAX_BLOG_FILES, checkBlogFiles, importBlogFiles, type BlogFile } from './blogs.server'
import { checkCertificationRows, importCertificationRows } from './certifications.server'
import { checkQuestionRows, importQuestionRows } from './questions.server'

type Body = { rows?: unknown; commit?: unknown; publish?: unknown; updateExisting?: unknown }

// Keeps only known columns and forces every value to a plain string, so
// nothing unexpected from the browser reaches the database layer.
function sanitizeRows(input: unknown, columns: readonly string[]): ImportRow[] | null {
  if (!Array.isArray(input) || input.length === 0 || input.length > IMPORT_BATCH_SIZE) return null
  const rows: ImportRow[] = []
  for (const item of input) {
    if (!item || typeof item !== 'object') return null
    const { row, values } = item as { row?: unknown; values?: unknown }
    if (typeof row !== 'number' || !values || typeof values !== 'object') return null
    const clean: Record<string, string> = {}
    for (const col of columns) {
      const v = (values as Record<string, unknown>)[col]
      clean[col] = typeof v === 'string' ? v.trim() : v == null ? '' : String(v).trim()
    }
    rows.push({ row, values: clean })
  }
  return rows
}

const importEndpoint = (
  columns: readonly string[],
  run: (req: PayloadRequest, rows: ImportRow[], body: Body) => Promise<RowResult[]>,
): Endpoint => ({
  path: '/import',
  method: 'post',
  handler: async (req) => {
    if (!isAdminUser(req)) {
      return Response.json({ error: 'Only admins can import.' }, { status: 403 })
    }
    await addDataAndFileToRequest(req)
    const body = (req.data || {}) as Body
    const rows = sanitizeRows(body.rows, columns)
    if (!rows) {
      return Response.json(
        { error: `Send between 1 and ${IMPORT_BATCH_SIZE} rows at a time.` },
        { status: 400 },
      )
    }
    try {
      return Response.json({ results: await run(req, rows, body) })
    } catch (err) {
      req.payload.logger.error({ err }, 'Import failed')
      return Response.json({ error: 'Import failed - see server logs.' }, { status: 500 })
    }
  },
})

// Study-guide blogs: Markdown files, one per domain. POST /api/posts/import-markdown
export const blogImportEndpoint: Endpoint = {
  path: '/import-markdown',
  method: 'post',
  handler: async (req) => {
    if (!isAdminUser(req)) {
      return Response.json({ error: 'Only admins can import.' }, { status: 403 })
    }
    await addDataAndFileToRequest(req)
    const body = (req.data || {}) as { files?: unknown; commit?: unknown; publish?: unknown; updateExisting?: unknown }
    const input = Array.isArray(body.files) ? body.files : []
    const files: BlogFile[] = []
    for (const f of input) {
      const { name, text } = (f || {}) as { name?: unknown; text?: unknown }
      if (typeof name !== 'string' || typeof text !== 'string' || text.length > MAX_BLOG_BYTES) {
        return Response.json({ error: 'Each file must be a Markdown text file under 300 KB.' }, { status: 400 })
      }
      files.push({ name: name.slice(0, 200), text })
    }
    if (files.length === 0 || files.length > MAX_BLOG_FILES) {
      return Response.json({ error: `Upload between 1 and ${MAX_BLOG_FILES} files at a time.` }, { status: 400 })
    }
    try {
      if (body.commit === true) {
        const results = await importBlogFiles(req, files, {
          publish: body.publish === true,
          updateExisting: body.updateExisting === true,
        })
        return Response.json({ results })
      }
      const checked = await checkBlogFiles(req, files)
      return Response.json({
        results: checked.map(({ blog: _blog, certId: _certId, existingPostId: _id, ...rest }) => rest),
      })
    } catch (err) {
      req.payload.logger.error({ err }, 'Blog import failed')
      return Response.json({ error: 'Import failed - see server logs.' }, { status: 500 })
    }
  },
}

export const questionImportEndpoint = importEndpoint(
  [...QUESTION_COLUMNS, ...QUESTION_OPTIONAL_COLUMNS],
  async (req, rows, body) => {
    if (body.commit === true) return importQuestionRows(req.payload, rows)
    const checked = await checkQuestionRows(req.payload, rows)
    return checked.map(({ record: _record, ...rest }) => rest)
  },
)

export const certificationImportEndpoint = importEndpoint(CERT_COLUMNS, async (req, rows, body) => {
  if (body.commit === true) {
    return importCertificationRows(req, rows, {
      publish: body.publish === true,
      updateExisting: body.updateExisting === true,
    })
  }
  const checked = await checkCertificationRows(req.payload, rows)
  return checked.map(({ data: _data, existingId: _id, ...rest }) => rest)
})
