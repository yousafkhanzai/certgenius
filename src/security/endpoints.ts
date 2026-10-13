import { addDataAndFileToRequest, type Endpoint, type PayloadRequest } from 'payload'

import { isAdminUser } from '@/access/roles'
import {
  gateConfig,
  gatePassCookie,
  isValidPattern,
  knownDeviceCookie,
  requestAddress,
  setGatePattern,
  tryGatePattern,
} from './adminGate'

// Admin pattern lock API (mounted under /api/admin-gate/...).

type Json = Record<string, unknown>

async function body(req: PayloadRequest): Promise<Json> {
  await addDataAndFileToRequest(req)
  return (req.data && typeof req.data === 'object' ? req.data : {}) as Json
}

const passed = (data: Json = {}) => {
  const headers = new Headers({ 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
  headers.append('Set-Cookie', gatePassCookie())
  headers.append('Set-Cookie', knownDeviceCookie())
  return new Response(JSON.stringify({ ok: true, ...data }), { status: 200, headers })
}

const refused = (attempt: Exclude<Awaited<ReturnType<typeof tryGatePattern>>, { ok: true }>) =>
  Response.json(attempt, { status: attempt.reason === 'locked' ? 429 : 401, headers: { 'Cache-Control': 'no-store' } })

const endpoint = (path: string, handler: (req: PayloadRequest) => Promise<Response>): Endpoint => ({
  path,
  method: 'post',
  handler: async (req) => {
    try {
      return await handler(req)
    } catch (err) {
      req.payload.logger.error({ err }, `admin gate endpoint ${path} failed`)
      return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
    }
  },
})

export const adminGateEndpoints: Endpoint[] = [
  // Anyone may try the pattern; wrong tries are counted and locked out.
  endpoint('/admin-gate/verify', async (req) => {
    const { pattern } = await body(req)
    const attempt = await tryGatePattern(req.payload, pattern, requestAddress(req.headers), req.headers.get('cookie'))
    return attempt.ok ? passed() : refused(attempt)
  }),

  // Set or change the pattern: logged-in admin only, and changing it needs the
  // current pattern as well.
  endpoint('/admin-gate/set', async (req) => {
    if (!isAdminUser(req)) return Response.json({ error: 'Not allowed.' }, { status: 403 })
    const { pattern, current } = await body(req)
    if (!isValidPattern(pattern)) {
      return Response.json({ error: 'Join at least 5 dots, using each dot only once.' }, { status: 400 })
    }
    if (await gateConfig(req.payload)) {
      const attempt = await tryGatePattern(req.payload, current, requestAddress(req.headers), req.headers.get('cookie'))
      if (!attempt.ok) return refused(attempt)
    }
    await setGatePattern(req.payload, pattern)
    req.payload.logger.warn(`Admin gate: pattern set by admin #${req.user?.id}`)
    return passed()
  }),
]
