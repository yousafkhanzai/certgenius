// Column layouts for the admin importers. Shared by the browser (to read the
// header row) and the server (to validate) - no server-only imports here.

export const QUESTION_COLUMNS = [
  'certification_slug',
  'domain_name',
  'question_text',
  'option_a',
  'option_b',
  'option_c',
  'option_d',
  'correct_answer',
  'explanation',
  'hint',
  'difficulty',
  'question_type',
  'blog_post_url',
  'reference_url',
] as const

export const QUESTION_OPTIONAL_COLUMNS = ['why_a', 'why_b', 'why_c', 'why_d'] as const

export const CERT_COLUMNS = ['name', 'exam_code', 'vendor', 'slug', 'category', 'status'] as const

export const CERT_SHEET_NAME = 'Topics and Subtopics'

// Rows are sent to the server in batches this size, which keeps each request
// well under Vercel's 4.5 MB request limit even with long explanations.
export const IMPORT_BATCH_SIZE = 250

export type ImportRow = { row: number; values: Record<string, string> }

export type RowResult = {
  row: number
  status: 'valid' | 'invalid' | 'duplicate' | 'exists' | 'imported' | 'updated'
  problems: string[]
  label?: string
  key?: string
}

export const normalizeHeader = (h: unknown) =>
  String(h ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')

// Questions must use the exact column order from the template file, optionally
// followed by why_a..why_d. Returns a problem description, or null when OK.
export function checkQuestionHeader(header: string[]): string | null {
  const expected = [...QUESTION_COLUMNS]
  for (let i = 0; i < expected.length; i++) {
    if (header[i] !== expected[i]) {
      return `Column ${i + 1} should be "${expected[i]}" but is "${header[i] ?? '(missing)'}". The columns must be in this exact order: ${expected.join(', ')}, then optionally why_a, why_b, why_c, why_d.`
    }
  }
  const rest = header.slice(expected.length).filter((h) => h !== '')
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] !== QUESTION_OPTIONAL_COLUMNS[i]) {
      return `Unexpected column "${rest[i]}" after reference_url. Only why_a, why_b, why_c, why_d (in that order) may follow.`
    }
  }
  return null
}

export function checkCertHeader(header: string[]): string | null {
  const missing = CERT_COLUMNS.filter((c) => !header.includes(c))
  return missing.length
    ? `Missing column(s): ${missing.join(', ')}. Expected: ${CERT_COLUMNS.join(', ')}.`
    : null
}

// Spreadsheet cells come back as strings, numbers, dates or booleans - the
// importers work with trimmed text only. Text is otherwise imported as-is
// (including the semicolons the source files use in place of commas).
export function cellToText(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (value instanceof Date) return value.toISOString()
  return String(value).trim()
}

export function rowsFromSheet(sheet: unknown[][]): { header: string[]; rows: ImportRow[] } {
  const [headerRow = [], ...body] = sheet
  const header = headerRow.map(normalizeHeader)
  const rows: ImportRow[] = []
  body.forEach((cells, i) => {
    const values: Record<string, string> = {}
    header.forEach((h, c) => {
      if (h) values[h] = cellToText(cells[c])
    })
    // Skip completely empty lines.
    if (Object.values(values).some((v) => v !== '')) rows.push({ row: i + 2, values })
  })
  return { header, rows }
}
