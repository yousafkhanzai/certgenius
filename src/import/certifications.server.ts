import type { Payload, PayloadRequest } from 'payload'

import {
  CERT_CATEGORIES,
  CERT_STATUSES,
  matchCategory,
  matchStatus,
} from '@/collections/Certifications/options'
import { validateHttpUrl } from '@/access/roles'
import type { ImportRow, RowResult } from './columns'

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export type CertImportOptions = {
  publish: boolean
  updateExisting: boolean
}

type Checked = RowResult & {
  data?: {
    title: string
    slug: string
    examCode: string | null
    vendor: string | null
    certCategory: NonNullable<ReturnType<typeof matchCategory>>
    examStatus: NonNullable<ReturnType<typeof matchStatus>>
  } & OptionalFields
  existingId?: number
}

// The optional columns, only when filled in (blank cells never overwrite).
type OptionalFields = Partial<{
  summary: string
  passingScore: number
  examQuestionCount: number
  durationMinutes: number
  delivery: string
  officialUrl: string
}>

function optionalFields(v: Record<string, string>, problems: string[]): OptionalFields {
  const out: OptionalFields = {}
  const num = (col: string, min: number, max: number) => {
    if (!v[col]) return undefined
    const n = Number(v[col].replace('%', '').trim())
    if (!Number.isInteger(n) || n < min || n > max) {
      problems.push(`${col} must be a whole number from ${min} to ${max} (got "${v[col]}")`)
      return undefined
    }
    return n
  }
  if (v.short_description) {
    if (v.short_description.length > 240) problems.push('short_description is longer than 240 characters')
    else out.summary = v.short_description
  }
  const pass = num('pass_score', 1, 100)
  if (pass !== undefined) out.passingScore = pass
  const questions = num('exam_questions', 1, 500)
  if (questions !== undefined) out.examQuestionCount = questions
  const minutes = num('duration_minutes', 1, 600)
  if (minutes !== undefined) out.durationMinutes = minutes
  if (v.delivery) out.delivery = v.delivery.slice(0, 200)
  if (v.official_url) {
    if (validateHttpUrl(v.official_url) !== true) problems.push('official_url must be a full https:// link')
    else out.officialUrl = v.official_url
  }
  return out
}

export async function checkCertificationRows(payload: Payload, rows: ImportRow[]): Promise<Checked[]> {
  const slugs = Array.from(new Set(rows.map((r) => r.values.slug).filter(Boolean)))
  const codes = Array.from(new Set(rows.map((r) => r.values.exam_code).filter(Boolean)))
  const existing = await payload.find({
    collection: 'certifications',
    where: { or: [{ slug: { in: slugs } }, { examCode: { in: codes } }] },
    draft: true,
    depth: 0,
    limit: 0,
    pagination: false,
    overrideAccess: true,
    select: { slug: true, examCode: true },
  })
  const existingBySlug = new Map(existing.docs.map((d) => [d.slug, Number(d.id)]))
  // A certification already on the site under a different web address (e.g.
  // "microsoft-azure-ai-fundamentals" vs "azure-ai-fundamentals") is matched
  // by its exam code, so importing never creates a second copy of it.
  const existingByCode = new Map(
    existing.docs.filter((d) => d.examCode).map((d) => [d.examCode as string, { id: Number(d.id), slug: d.slug }]),
  )

  const seen = new Set<string>()
  return rows.map(({ row, values: v }) => {
    const problems: string[] = []
    if (!v.name) problems.push('name is empty')
    if (!v.slug) problems.push('slug is empty')
    else if (!SLUG_PATTERN.test(v.slug)) {
      problems.push(`slug "${v.slug}" may only use lowercase letters, numbers and single hyphens`)
    }
    if (v.name.length > 200) problems.push('name is longer than 200 characters')

    const certCategory = v.category ? matchCategory(v.category) : null
    if (!v.category) problems.push('category is empty')
    else if (!certCategory) {
      problems.push(
        `category "${v.category}" is not one of the 20 categories (${CERT_CATEGORIES.map((c) => c.label).join(', ')})`,
      )
    }
    const extra = optionalFields(v, problems)
    const examStatus = v.status ? matchStatus(v.status) : 'active'
    if (!examStatus) {
      problems.push(
        `status "${v.status}" must be one of: ${CERT_STATUSES.map((s) => s.label).join(', ')}`,
      )
    }

    const label = v.name || v.slug
    if (problems.length || !certCategory || !examStatus) return { row, status: 'invalid', problems, label }

    if (seen.has(v.slug)) {
      return { row, status: 'duplicate', problems: ['slug appears earlier in this file'], label }
    }
    seen.add(v.slug)

    const data = {
      title: v.name,
      slug: v.slug,
      examCode: v.exam_code || null,
      vendor: v.vendor || null,
      certCategory,
      examStatus,
      ...extra,
    }
    const existingId = existingBySlug.get(v.slug)
    if (existingId !== undefined) {
      return { row, status: 'exists', problems: [], label, key: v.slug, data, existingId }
    }
    const byCode = v.exam_code ? existingByCode.get(v.exam_code) : undefined
    if (byCode) {
      return {
        row,
        status: 'exists',
        problems: [`same exam code as the existing "${byCode.slug}" - that one is kept`],
        label,
        key: v.slug,
        data,
        existingId: byCode.id,
      }
    }
    return { row, status: 'valid', problems, label, key: v.slug, data }
  })
}

export async function importCertificationRows(
  req: PayloadRequest,
  rows: ImportRow[],
  options: CertImportOptions,
): Promise<RowResult[]> {
  const { payload } = req
  const checked = await checkCertificationRows(payload, rows)

  for (const r of checked) {
    if (!r.data) continue
    try {
      if (r.status === 'valid') {
        await payload.create({
          collection: 'certifications',
          data: { ...r.data, _status: options.publish ? 'published' : 'draft' },
          draft: !options.publish,
          overrideAccess: true,
          req,
        })
        r.status = 'imported'
      } else if (r.status === 'exists' && options.updateExisting && r.existingId) {
        // Only the spreadsheet's own columns are updated; the name, slug and
        // everything written in the admin (overview, domains, FAQs...) stay as they are.
        await payload.update({
          collection: 'certifications',
          id: r.existingId,
          data: {
            examCode: r.data.examCode,
            vendor: r.data.vendor,
            certCategory: r.data.certCategory,
            examStatus: r.data.examStatus,
            // Optional columns: only the ones filled in on the sheet.
            ...Object.fromEntries(
              (['summary', 'passingScore', 'examQuestionCount', 'durationMinutes', 'delivery', 'officialUrl'] as const)
                .filter((k) => r.data?.[k] !== undefined)
                .map((k) => [k, r.data?.[k]]),
            ),
          },
          draft: true,
          overrideAccess: true,
          req,
        })
        r.status = 'updated'
        r.problems.push('saved as a draft change - publish it in the admin to make it live')
      }
    } catch (err) {
      r.status = 'invalid'
      r.problems.push(err instanceof Error ? err.message : 'could not be saved')
    }
  }
  return checked.map(({ data: _data, existingId: _id, ...rest }) => rest)
}
