import type { Payload } from 'payload'

import { validateHttpUrl, validateLinkOrSitePath } from '@/access/roles'
import { questionHash } from '@/collections/Questions/hash'
import type { ImportRow, RowResult } from './columns'

const REQUIRED = [
  'certification_slug',
  'domain_name',
  'question_text',
  'option_a',
  'option_b',
  'option_c',
  'option_d',
  'correct_answer',
  'explanation',
  'difficulty',
] as const

const MAX_LENGTH: Record<string, number> = {
  question_text: 5000,
  option_a: 2000,
  option_b: 2000,
  option_c: 2000,
  option_d: 2000,
  explanation: 10000,
  hint: 2000,
  why_a: 4000,
  why_b: 4000,
  why_c: 4000,
  why_d: 4000,
}

const LEVELS = ['easy', 'medium', 'hard'] as const

type CertInfo = { id: number; domains: Set<string> }

type Checked = RowResult & {
  record?: Record<string, unknown>
}

async function loadCertifications(payload: Payload, slugs: string[]): Promise<Map<string, CertInfo>> {
  const found = await payload.find({
    collection: 'certifications',
    where: { slug: { in: slugs } },
    draft: true,
    depth: 0,
    limit: slugs.length || 1,
    pagination: false,
    overrideAccess: true,
    select: { slug: true, domains: true },
  })
  const map = new Map<string, CertInfo>()
  for (const cert of found.docs) {
    if (!cert.slug) continue
    map.set(cert.slug, {
      id: Number(cert.id),
      domains: new Set((cert.domains || []).map((d) => d.name.trim())),
    })
  }
  return map
}

// Validates a batch of spreadsheet rows. Nothing is written here.
export async function checkQuestionRows(payload: Payload, rows: ImportRow[]): Promise<Checked[]> {
  const slugs = Array.from(new Set(rows.map((r) => r.values.certification_slug).filter(Boolean)))
  const certs = await loadCertifications(payload, slugs)

  const results: Checked[] = rows.map(({ row, values: v }) => {
    const problems: string[] = []
    for (const col of REQUIRED) if (!v[col]) problems.push(`${col} is empty`)
    for (const [col, max] of Object.entries(MAX_LENGTH)) {
      if ((v[col] || '').length > max) problems.push(`${col} is longer than ${max} characters`)
    }

    const cert = v.certification_slug ? certs.get(v.certification_slug) : undefined
    if (v.certification_slug && !cert) {
      problems.push(`unknown certification "${v.certification_slug}"`)
    }
    if (cert && v.domain_name && !cert.domains.has(v.domain_name)) {
      problems.push(
        cert.domains.size
          ? `domain "${v.domain_name}" is not one of this certification's domains (${[...cert.domains].join(' | ')})`
          : `domain "${v.domain_name}" - this certification has no domains set up yet`,
      )
    }

    const correct = (v.correct_answer || '').toUpperCase()
    if (v.correct_answer && !['A', 'B', 'C', 'D'].includes(correct)) {
      problems.push(`correct_answer must be A, B, C or D (got "${v.correct_answer}")`)
    }
    const level = (v.difficulty || '').toLowerCase()
    if (v.difficulty && !(LEVELS as readonly string[]).includes(level)) {
      problems.push(`difficulty must be easy, medium or hard (got "${v.difficulty}")`)
    }
    const type = (v.question_type || 'single').toLowerCase()
    if (type !== 'single') problems.push(`question_type must be "single" (got "${v.question_type}")`)
    if (v.blog_post_url && validateLinkOrSitePath(v.blog_post_url) !== true) {
      problems.push('blog_post_url must be an https:// link or a path on this site starting with /')
    }
    if (v.reference_url && validateHttpUrl(v.reference_url) !== true) {
      problems.push('reference_url is not a valid https:// link')
    }

    const label = (v.question_text || '').slice(0, 120)
    if (problems.length || !cert) return { row, status: 'invalid', problems, label }

    const key = questionHash(cert.id, v.question_text)
    return {
      row,
      status: 'valid',
      problems,
      label,
      key,
      record: {
        certification: cert.id,
        domainName: v.domain_name,
        questionText: v.question_text,
        optionA: v.option_a,
        optionB: v.option_b,
        optionC: v.option_c,
        optionD: v.option_d,
        correctAnswer: correct,
        explanation: v.explanation,
        whyA: v.why_a || null,
        whyB: v.why_b || null,
        whyC: v.why_c || null,
        whyD: v.why_d || null,
        hint: v.hint || null,
        level,
        questionType: 'single',
        blogPostUrl: v.blog_post_url || null,
        referenceUrl: v.reference_url || null,
        contentHash: key,
      },
    }
  })

  // Duplicates: repeated inside this batch, or already in the database.
  const seen = new Set<string>()
  for (const r of results) {
    if (r.status !== 'valid' || !r.key) continue
    if (seen.has(r.key)) {
      r.status = 'duplicate'
      r.problems.push('same question appears earlier in this file')
    }
    seen.add(r.key)
  }
  const keys = results.filter((r) => r.status === 'valid').map((r) => r.key as string)
  if (keys.length) {
    const existing = await payload.find({
      collection: 'questions',
      where: { contentHash: { in: keys } },
      depth: 0,
      limit: keys.length,
      pagination: false,
      overrideAccess: true,
      select: { contentHash: true },
    })
    const inDb = new Set(existing.docs.map((d) => d.contentHash))
    for (const r of results) {
      if (r.status === 'valid' && r.key && inDb.has(r.key)) {
        r.status = 'duplicate'
        r.problems.push('this question already exists for this certification')
      }
    }
  }
  return results
}

// Inserts the valid rows of a batch in a single statement. ON CONFLICT on the
// unique content hash makes it safe even if the same batch is sent twice.
export async function importQuestionRows(payload: Payload, rows: ImportRow[]): Promise<RowResult[]> {
  const checked = await checkQuestionRows(payload, rows)
  const toInsert = checked.filter((r) => r.status === 'valid' && r.record)
  if (toInsert.length) {
    const now = new Date().toISOString()
    const table = payload.db.tables.questions
    const inserted = await payload.db.drizzle
      .insert(table)
      .values(toInsert.map((r) => ({ ...r.record, createdAt: now, updatedAt: now })))
      .onConflictDoNothing({ target: table.contentHash })
      .returning({ contentHash: table.contentHash })
    const insertedKeys = new Set(inserted.map((i: { contentHash: string }) => i.contentHash))
    for (const r of toInsert) {
      if (insertedKeys.has(r.key as string)) {
        r.status = 'imported'
      } else {
        r.status = 'duplicate'
        r.problems.push('this question already exists for this certification')
      }
    }
  }
  return checked.map(({ record: _record, ...rest }) => rest)
}
