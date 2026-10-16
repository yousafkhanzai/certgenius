import { convertMarkdownToLexical, editorConfigFactory } from '@payloadcms/richtext-lexical'
import type { PayloadRequest } from 'payload'

import { validateHttpUrl } from '@/access/roles'
import { AFFILIATE_TYPES } from '@/collections/Certifications/options'
import { LIST_SEPARATOR, type PageBundle, type RowResult } from './columns'

// Certification PAGE content import (the extra sheets of the certification
// workbook: Page, Study plan, Compare, Resources, Courses, FAQs).
//   - "Page" fields: only cells that are filled in are saved.
//   - The lists (study plan, comparison rows, resources, courses, FAQs) are
//     REPLACED by the sheet's rows for that certification, in sheet order -
//     but only for lists that have rows in this upload. Leave a sheet out to
//     keep what is already on the site.
// Domains, questions and blogs are not touched here.

const MAX = { short: 200, medium: 600, long: 5000, overview: 20000 }

type Checked = RowResult & { bundle?: PageBundle; certId?: number; data?: Record<string, unknown> }

const split = (cell: string) =>
  cell
    .split(LIST_SEPARATOR)
    .map((s) => s.trim())
    .filter(Boolean)

function matchCourseType(input: string) {
  const n = input.trim().toLowerCase()
  return AFFILIATE_TYPES.find((t) => t.label.toLowerCase() === n || t.value === n)?.value ?? null
}

export async function checkPageBundles(req: PayloadRequest, bundles: PageBundle[], pending: string[] = []): Promise<Checked[]> {
  const { payload } = req
  const related = bundles.flatMap((b) => (b.page[0]?.related_certifications ? split(b.page[0].related_certifications) : []))
  const slugs = Array.from(new Set([...bundles.map((b) => b.slug), ...related]))
  const found = await payload.find({
    collection: 'certifications',
    where: { slug: { in: slugs } },
    draft: true,
    depth: 0,
    limit: 0,
    pagination: false,
    overrideAccess: true,
    select: { slug: true },
  })
  const idBySlug = new Map(found.docs.map((d) => [d.slug as string, Number(d.id)]))

  return bundles.map((b, i) => {
    const problems: string[] = []
    const notes: string[] = []
    const label = b.slug
    const certId = idBySlug.get(b.slug)
    if (!certId && !pending.includes(b.slug)) problems.push(`unknown certification "${b.slug}" - import the certification first`)
    if (b.page.length > 1) problems.push('the Page sheet has more than one row for this certification')

    const tooLong = (where: string, value: string | undefined, max: number) => {
      if (value && value.length > max) problems.push(`${where} is longer than ${max} characters`)
    }
    const data: Record<string, unknown> = {}

    const p = b.page[0]
    if (p) {
      tooLong('overview', p.overview, MAX.overview)
      tooLong('who_its_for', p.who_its_for, MAX.long)
      tooLong('background', p.background, MAX.long)
      for (const col of ['author_name', 'author_role', 'reviewer_name', 'reviewer_credential', 'compared_exam_name'] as const) {
        tooLong(col, p[col], MAX.short)
      }
      if (p.who_its_for) data.whoItsFor = p.who_its_for
      if (p.background) data.background = p.background
      if (p.roles) data.roles = split(p.roles).map((role) => ({ role: role.slice(0, MAX.short) }))
      if (p.author_name) data.authorName = p.author_name
      if (p.author_role) data.authorRole = p.author_role
      if (p.reviewer_name) data.reviewerName = p.reviewer_name
      if (p.reviewer_credential) data.reviewerCredential = p.reviewer_credential
      if (p.compared_exam_name) data.comparedExamName = p.compared_exam_name
      if (p.related_certifications) {
        const ids: number[] = []
        for (const slug of split(p.related_certifications)) {
          const id = idBySlug.get(slug)
          if (!id) notes.push(`related certification "${slug}" not found - skipped`)
          else if (slug !== b.slug) ids.push(id)
        }
        data.relatedCertifications = ids
      }
      if (p.overview) data.overviewMarkdown = p.overview
    }

    if (b.plan.length) {
      data.studyPlan = b.plan.map((r, n) => {
        if (!r.title && !r.text) problems.push(`Study plan row ${n + 1}: title and text are empty`)
        tooLong(`Study plan row ${n + 1} text`, r.text, MAX.long)
        return { label: r.week_label || `Week ${n + 1}`, title: r.title || null, text: r.text || null }
      })
    }
    if (b.compare.length) {
      data.comparisonRows = b.compare.map((r, n) => {
        if (!r.label) problems.push(`Compare row ${n + 1}: label is empty`)
        return { label: r.label, thisExam: r.this_exam || null, otherExam: r.compared_exam || null }
      })
    }
    if (b.resources.length) {
      data.officialResources = b.resources.map((r, n) => {
        if (!r.name) problems.push(`Resources row ${n + 1}: name is empty`)
        if (validateHttpUrl(r.url) !== true || !r.url) problems.push(`Resources row ${n + 1}: url must be a full https:// link`)
        tooLong(`Resources row ${n + 1} description`, r.description, MAX.medium)
        return { name: r.name, description: r.description || null, url: r.url }
      })
    }
    // A course without a link yet is skipped (the owner adds affiliate links).
    const courses = b.courses.filter((r) => r.url)
    if (b.courses.length > courses.length) notes.push(`${b.courses.length - courses.length} course row(s) skipped: no url yet`)
    if (courses.length) {
      data.affiliateCourses = courses.map((r, n) => {
        const type = matchCourseType(r.type || '')
        if (!type) problems.push(`Courses row ${n + 1}: type must be Video course, Hands-on labs or Official training`)
        if (!r.title) problems.push(`Courses row ${n + 1}: title is empty`)
        if (validateHttpUrl(r.url) !== true || !r.url) problems.push(`Courses row ${n + 1}: url must be a full https:// link`)
        return {
          type,
          partner: r.partner || null,
          title: r.title,
          url: r.url,
          bulletOne: r.bullet_1 || null,
          bulletTwo: r.bullet_2 || null,
        }
      })
    }
    if (b.faqs.length) {
      data.faqs = b.faqs.map((r, n) => {
        if (!r.question || !r.answer) problems.push(`FAQs row ${n + 1}: question and answer are both needed`)
        tooLong(`FAQs row ${n + 1} answer`, r.answer, MAX.long)
        return { question: r.question, answer: r.answer }
      })
    }

    const summary = [
      p && 'page text',
      b.plan.length && `${b.plan.length} study-plan week(s)`,
      b.compare.length && `${b.compare.length} comparison row(s)`,
      b.resources.length && `${b.resources.length} resource(s)`,
      courses.length && `${courses.length} course(s)`,
      b.faqs.length && `${b.faqs.length} FAQ(s)`,
    ].filter(Boolean)
    if (problems.length) return { row: i + 1, status: 'invalid', problems, label }
    return {
      row: i + 1,
      status: 'valid',
      problems: [`will save: ${summary.join(', ') || 'nothing'}`, ...notes],
      label,
      key: b.slug,
      bundle: b,
      certId,
      data,
    }
  })
}

export async function importPageBundles(req: PayloadRequest, bundles: PageBundle[]): Promise<RowResult[]> {
  const { payload } = req
  const checked = await checkPageBundles(req, bundles)
  const editorConfig = await editorConfigFactory.default({ config: payload.config })

  for (const r of checked) {
    if (r.status !== 'valid' || !r.certId || !r.data) continue
    try {
      const { overviewMarkdown, ...data } = r.data
      if (typeof overviewMarkdown === 'string') {
        data.overview = convertMarkdownToLexical({ editorConfig, markdown: overviewMarkdown })
      }
      const liveRow = await payload.find({
        collection: 'certifications',
        where: { and: [{ id: { equals: r.certId } }, { _status: { equals: 'published' } }] },
        depth: 0,
        limit: 1,
        overrideAccess: true,
        select: { slug: true },
      })
      // Saved as a draft change (also for a live certification), so it joins
      // any domain changes from the same upload; "Publish changes" on
      // Certification health makes it live.
      await payload.update({
        collection: 'certifications',
        id: r.certId,
        data,
        draft: true,
        overrideAccess: true,
        req,
      })
      r.status = 'updated'
      r.problems = r.problems.map((t) => t.replace('will save', 'saved'))
      if (liveRow.docs.length) r.problems.push('this certification is live: press "Publish changes" on Certification health to show the new content')
    } catch (err) {
      r.status = 'invalid'
      r.problems.push(err instanceof Error ? err.message : 'could not be saved')
    }
  }
  return checked.map(({ bundle: _b, certId: _c, data: _d, ...rest }) => rest)
}
