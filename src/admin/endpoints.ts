import { addDataAndFileToRequest, APIError, type Endpoint, type PayloadRequest } from 'payload'

import { isAdminUser } from '@/access/roles'
import { publishProblems } from '@/collections/Certifications/publishRule'
import { REPORT_STATUSES } from './data'

// Admin tools API (mounted under /api/admin-tools/...). Admins only.

type Json = Record<string, unknown>

async function body(req: PayloadRequest): Promise<Json> {
  await addDataAndFileToRequest(req)
  return (req.data && typeof req.data === 'object' ? req.data : {}) as Json
}

const asId = (v: unknown): number | null => {
  const n = typeof v === 'string' ? Number(v) : v
  return typeof n === 'number' && Number.isInteger(n) && n > 0 ? n : null
}

const endpoint = (path: string, handler: (req: PayloadRequest) => Promise<Response>): Endpoint => ({
  path,
  method: 'post',
  handler: async (req) => {
    if (!isAdminUser(req)) return Response.json({ error: 'Not allowed.' }, { status: 403 })
    try {
      return await handler(req)
    } catch (err) {
      // The publishing rule explains exactly what is missing; pass that on.
      if (err instanceof APIError && err.isPublic) return Response.json({ error: err.message }, { status: 400 })
      req.payload.logger.error({ err }, `admin tools ${path} failed`)
      return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
    }
  },
})

export const adminToolEndpoints: Endpoint[] = [
  // Publish or unpublish a certification. Publishing goes through the normal
  // save, so the HARD RULE (domains, questions, blogs) is checked as usual.
  endpoint('/admin-tools/certification-status', async (req) => {
    const { id: rawId, publish } = await body(req)
    const id = asId(rawId)
    if (!id || typeof publish !== 'boolean') return Response.json({ error: 'Bad request.' }, { status: 400 })

    // Publish what was last saved in the admin (the latest draft), not an older copy.
    const latest = await req.payload.findByID({ collection: 'certifications', id, draft: true, depth: 0, req })
    const { id: _id, createdAt: _c, updatedAt: _u, ...data } = latest
    // HARD RULE, checked every time - also when re-publishing a live
    // certification's changes (e.g. a domain added later).
    if (publish) {
      const problems = await publishProblems(req.payload, id, latest.domains || [])
      if (problems.length) {
        return Response.json(
          { error: `Can't publish yet. Every domain needs questions and a published blog. Missing: ${problems.join('; ')}.` },
          { status: 400 },
        )
      }
    }
    await req.payload.update({
      collection: 'certifications',
      id,
      data: { ...data, _status: publish ? 'published' : 'draft' },
      req,
    })
    return Response.json({ ok: true })
  }),

  endpoint('/admin-tools/report-status', async (req) => {
    const { id: rawId, status } = await body(req)
    const id = asId(rawId)
    if (!id || !REPORT_STATUSES.some((s) => s.value === status)) return Response.json({ error: 'Bad request.' }, { status: 400 })
    await req.payload.update({
      collection: 'problem-reports',
      id,
      data: { status: status as (typeof REPORT_STATUSES)[number]['value'] },
      req,
    })
    return Response.json({ ok: true })
  }),
]
