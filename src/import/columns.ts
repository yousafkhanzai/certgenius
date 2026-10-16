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

// Optional extra certification columns (any order, may be left out or blank).
export const CERT_OPTIONAL_COLUMNS = [
  'short_description',
  'pass_score',
  'exam_questions',
  'duration_minutes',
  'delivery',
  'official_url',
] as const

// Domains: a second sheet named "Domains" in the certification workbook, or a
// separate file. One row per domain.
export const DOMAIN_COLUMNS = ['certification_slug', 'domain_name', 'weight', 'blog_post_url'] as const
export const DOMAIN_REQUIRED_COLUMNS = ['certification_slug', 'domain_name'] as const
export const DOMAIN_SHEET_NAME = 'Domains'
export const DOMAIN_HEADER_ALIASES: Record<string, string> = {
  slug: 'certification_slug',
  certification: 'certification_slug',
  domain: 'domain_name',
  name: 'domain_name',
  weight_percent: 'weight',
  weight_pct: 'weight',
  blog: 'blog_post_url',
  blog_url: 'blog_post_url',
  blog_slug: 'blog_post_url',
}
export const DOMAIN_SHEET_OPTIONS = { aliases: DOMAIN_HEADER_ALIASES, blankPlaceholders: true }

export function checkDomainHeader(header: string[]): string | null {
  const missing = DOMAIN_REQUIRED_COLUMNS.filter((c) => !header.includes(c))
  return missing.length
    ? `Domains: missing column(s) ${missing.join(', ')}. Expected: ${DOMAIN_COLUMNS.join(', ')}.`
    : null
}

export const CERT_SHEET_NAME = 'Topics and Subtopics'

// The Topics spreadsheet names some columns differently; these are read as
// the standard ones. Other columns (topic, priority, notes) are ignored.
export const CERT_HEADER_ALIASES: Record<string, string> = {
  subtopic_certification: 'name',
  certification: 'name',
  certification_name: 'name',
  topic_category: 'category',
  code: 'exam_code',
  description: 'short_description',
  summary: 'short_description',
  passing_score: 'pass_score',
  pass_score_percent: 'pass_score',
  pass_mark: 'pass_score',
  questions: 'exam_questions',
  exam_question_count: 'exam_questions',
  number_of_questions: 'exam_questions',
  duration: 'duration_minutes',
  minutes: 'duration_minutes',
  time_minutes: 'duration_minutes',
  official_link: 'official_url',
  official_page: 'official_url',
}

// "—", "-" and "n/a" in a spreadsheet mean "no value".
const PLACEHOLDERS = new Set(['—', '–', '-', 'n/a', 'na', 'none'])

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

// Question files are imported exactly as written; only the certification
// sheet uses aliases and "—"-style placeholders.
export const CERT_SHEET_OPTIONS = { aliases: CERT_HEADER_ALIASES, blankPlaceholders: true }

export function rowsFromSheet(
  sheet: unknown[][],
  { aliases = {}, blankPlaceholders = false }: { aliases?: Record<string, string>; blankPlaceholders?: boolean } = {},
): { header: string[]; rows: ImportRow[] } {
  const [headerRow = [], ...body] = sheet
  const header = headerRow.map((h) => {
    const n = normalizeHeader(h)
    return aliases[n] ?? n
  })
  const rows: ImportRow[] = []
  body.forEach((cells, i) => {
    const values: Record<string, string> = {}
    header.forEach((h, c) => {
      if (!h) return
      const text = cellToText(cells[c])
      values[h] = blankPlaceholders && PLACEHOLDERS.has(text.toLowerCase()) ? '' : text
    })
    // Skip completely empty lines.
    if (Object.values(values).some((v) => v !== '')) rows.push({ row: i + 2, values })
  })
  return { header, rows }
}

// Certification PAGE content: optional extra sheets in the certification
// workbook. One row per item; every row starts with certification_slug.
// "Page" has one row per certification; lists inside a cell (roles,
// related certifications) are separated with " | ".
export const PAGE_SHEETS = {
  page: {
    sheet: 'Page',
    columns: [
      'certification_slug',
      'overview',
      'who_its_for',
      'background',
      'roles',
      'author_name',
      'author_role',
      'reviewer_name',
      'reviewer_credential',
      'compared_exam_name',
      'related_certifications',
    ],
  },
  plan: { sheet: 'Study plan', columns: ['certification_slug', 'week_label', 'title', 'text'] },
  compare: { sheet: 'Compare', columns: ['certification_slug', 'label', 'this_exam', 'compared_exam'] },
  resources: { sheet: 'Resources', columns: ['certification_slug', 'name', 'description', 'url'] },
  courses: {
    sheet: 'Courses',
    columns: ['certification_slug', 'type', 'partner', 'title', 'url', 'bullet_1', 'bullet_2'],
  },
  faqs: { sheet: 'FAQs', columns: ['certification_slug', 'question', 'answer'] },
} as const

export type PageSheetKey = keyof typeof PAGE_SHEETS
export const PAGE_SHEET_KEYS = Object.keys(PAGE_SHEETS) as PageSheetKey[]

// Everything one certification's page needs, gathered from the extra sheets.
export type PageBundle = { slug: string } & { [K in PageSheetKey]: Record<string, string>[] }

export const LIST_SEPARATOR = '|'
