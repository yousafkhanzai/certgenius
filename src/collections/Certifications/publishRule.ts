import { APIError, type CollectionBeforeChangeHook, type Payload } from 'payload'
import type { Pool } from 'pg'

// HARD RULE: a certification can only be published when
//   (a) it has domains,
//   (b) every domain has questions, and
//   (c) every domain has a published blog (one blog per domain).
// This runs at the moment of publishing (draft -> published). It lists
// exactly what is missing so it can be fixed in the admin.

type DomainInput = { name?: string | null; studyGuide?: number | string | { id: number | string } | null }

export async function publishProblems(
  payload: Payload,
  certificationId: number | string | undefined,
  domains: DomainInput[],
): Promise<string[]> {
  const problems: string[] = []
  if (!domains.length) return ['add at least one domain (Domains tab)']

  const db = (payload.db as unknown as { pool: Pool }).pool
  const counts = new Map<string, number>()
  if (certificationId !== undefined) {
    const { rows } = await db.query<{ domain_name: string; n: number }>(
      `select domain_name, count(*)::int as n from questions
       where certification_id = $1 and option_a is not null and correct_answer is not null group by domain_name`,
      [certificationId],
    )
    for (const r of rows) counts.set(r.domain_name, r.n)
  }

  const guideIds = domains
    .map((d) => (d.studyGuide && typeof d.studyGuide === 'object' ? d.studyGuide.id : d.studyGuide))
    .filter((id): id is number | string => id !== null && id !== undefined)
  const published = new Set<string>()
  if (guideIds.length) {
    const { rows } = await db.query<{ id: number }>(`select id from posts where id = any($1::int[]) and _status = 'published'`, [
      guideIds.map(Number),
    ])
    for (const r of rows) published.add(String(r.id))
  }

  for (const d of domains) {
    const name = d.name || '(unnamed domain)'
    if (!counts.get(d.name || '')) problems.push(`"${name}" has no questions yet`)
    const guide = d.studyGuide && typeof d.studyGuide === 'object' ? d.studyGuide.id : d.studyGuide
    if (guide === null || guide === undefined) problems.push(`"${name}" has no blog attached`)
    else if (!published.has(String(guide))) problems.push(`the blog for "${name}" is not published`)
  }
  return problems
}

export const enforcePublishRule: CollectionBeforeChangeHook = async ({ data, originalDoc, req, context }) => {
  const publishing = data._status === 'published' && originalDoc?._status !== 'published'
  if (!publishing || context.skipPublishRule) return data
  const domains = (data.domains ?? originalDoc?.domains ?? []) as DomainInput[]
  const problems = await publishProblems(req.payload, originalDoc?.id, domains)
  if (problems.length) {
    throw new APIError(
      `This certification can't be published yet. Every domain needs questions and a published blog. Missing: ${problems.join('; ')}.`,
      400,
      undefined,
      true,
    )
  }
  return data
}
