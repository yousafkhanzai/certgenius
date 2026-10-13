import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'crypto'
import type { Payload } from 'payload'

// ADMIN PATTERN LOCK ("the gate").
//
// A second lock in front of the admin, on top of the email + password login:
// the owner draws a pattern on a 3x3 grid before the login page appears.
//   - The login page redirects to /admin-gate until the pattern is entered.
//   - The login API itself refuses to log anyone in without the gate pass, so
//     knowing the password alone is not enough.
//   - Passing the gate sets a signed, HttpOnly cookie that lasts 12 hours.
//   - Wrong patterns are counted: 5 from one address locks that address out
//     for 15 minutes, and 25 in an hour from anywhere locks the gate for an hour.
//
// The pattern is stored only as a salted scrypt hash, peppered with
// PAYLOAD_SECRET (which is not in the database), in Payload's key-value store.
// Until the owner sets a pattern (Admin > Admin security) the gate is off.

export const GATE_COOKIE = 'cg_gate'
export const KNOWN_COOKIE = 'cg_known'
const KNOWN_DAYS = 365
const PASS_HOURS = 12
const CONFIG_KEY = 'admin-gate:config'
const PER_ADDRESS_LIMIT = 5
const PER_ADDRESS_LOCK_MS = 15 * 60 * 1000
const GLOBAL_LIMIT = 25
const GLOBAL_WINDOW_MS = 60 * 60 * 1000

type GateConfig = { hash: string; salt: string; setAt: string }
type FailRecord = { count: number; windowStart: number; lockedUntil: number }

const secret = () => {
  const s = process.env.PAYLOAD_SECRET
  if (!s) throw new Error('PAYLOAD_SECRET is not set')
  return s
}

// A pattern is the order the dots were joined in, e.g. "03678" (dots are
// numbered 0-8, left to right, top to bottom). At least 5 dots, none twice.
export function isValidPattern(pattern: unknown): pattern is string {
  return typeof pattern === 'string' && /^[0-8]{5,9}$/.test(pattern) && new Set(pattern).size === pattern.length
}

const hashPattern = (pattern: string, salt: string) => scryptSync(`${pattern}|${secret()}`, salt, 32).toString('hex')

export async function gateConfig(payload: Payload): Promise<GateConfig | null> {
  return payload.kv.get<GateConfig>(CONFIG_KEY)
}

export async function setGatePattern(payload: Payload, pattern: string): Promise<void> {
  const salt = randomBytes(16).toString('hex')
  await payload.kv.set(CONFIG_KEY, { hash: hashPattern(pattern, salt), salt, setAt: new Date().toISOString() })
}

export async function clearGatePattern(payload: Payload): Promise<void> {
  await payload.kv.delete(CONFIG_KEY)
}

// ---------- the pass cookie ----------

const sign = (expires: number, purpose = 'admin-gate') =>
  createHmac('sha256', secret()).update(`${purpose}|${expires}`).digest('hex')

export function gatePassCookie(): string {
  const expires = Date.now() + PASS_HOURS * 60 * 60 * 1000
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  return `${GATE_COOKIE}=${expires}.${sign(expires)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${PASS_HOURS * 60 * 60}${secure}`
}

// A long-lived marker for a browser that has entered the right pattern before.
// It opens nothing on its own: it only keeps the owner's own browser usable
// while the gate is locked for everyone else (see GLOBAL_LIMIT).
export function knownDeviceCookie(): string {
  const expires = Date.now() + KNOWN_DAYS * 24 * 60 * 60 * 1000
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  return `${KNOWN_COOKIE}=${expires}.${sign(expires, 'known-device')}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${KNOWN_DAYS * 24 * 60 * 60}${secure}`
}

// The address a request came from. Vercel sets these headers itself, so a
// visitor cannot fake them there.
export function requestAddress(headers: Headers): string {
  return headers.get('x-real-ip') || (headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown'
}

export function hasValidGatePass(cookieValue: string | undefined | null, purpose = 'admin-gate'): boolean {
  if (!cookieValue) return false
  const [expiresRaw, signature] = cookieValue.split('.')
  const expires = Number(expiresRaw)
  if (!signature || !Number.isFinite(expires) || expires < Date.now()) return false
  const expected = Buffer.from(sign(expires, purpose), 'hex')
  const given = Buffer.from(signature, 'hex')
  return expected.length === given.length && timingSafeEqual(expected, given)
}

export function cookieFromHeader(header: string | null | undefined, name: string): string | undefined {
  return (header || '')
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1)
}

// True when the admin may be reached: the gate is off, or this browser has passed it.
export async function gateIsOpen(payload: Payload, cookieHeader: string | null | undefined): Promise<boolean> {
  const config = await gateConfig(payload)
  if (!config) return true
  return hasValidGatePass(cookieFromHeader(cookieHeader, GATE_COOKIE))
}

// ---------- checking a drawn pattern ----------

const failKey = (address: string) => `admin-gate:fail:${createHmac('sha256', secret()).update(address).digest('hex').slice(0, 32)}`
const GLOBAL_KEY = 'admin-gate:fail:all'

const fresh = (r: FailRecord | null, windowMs: number): FailRecord =>
  r && Date.now() - r.windowStart < windowMs ? r : { count: 0, windowStart: Date.now(), lockedUntil: r?.lockedUntil || 0 }

export type GateAttempt =
  | { ok: true }
  | { ok: false; reason: 'locked'; retryInSeconds: number }
  | { ok: false; reason: 'wrong'; triesLeft: number }

export async function tryGatePattern(
  payload: Payload,
  pattern: unknown,
  address: string,
  cookieHeader?: string | null,
): Promise<GateAttempt> {
  const config = await gateConfig(payload)
  if (!config) return { ok: true }

  const own = fresh(await payload.kv.get<FailRecord>(failKey(address)), PER_ADDRESS_LOCK_MS)
  const all = fresh(await payload.kv.get<FailRecord>(GLOBAL_KEY), GLOBAL_WINDOW_MS)
  // The everyone-lock does not apply to a browser that has passed before, so
  // nobody can keep the owner out just by guessing wrong all day.
  const known = hasValidGatePass(cookieFromHeader(cookieHeader, KNOWN_COOKIE), 'known-device')
  const lockedUntil = Math.max(own.lockedUntil, known ? 0 : all.lockedUntil)
  if (lockedUntil > Date.now()) {
    return { ok: false, reason: 'locked', retryInSeconds: Math.ceil((lockedUntil - Date.now()) / 1000) }
  }

  let matches = false
  if (isValidPattern(pattern)) {
    const expected = Buffer.from(config.hash, 'hex')
    const given = Buffer.from(hashPattern(pattern, config.salt), 'hex')
    matches = expected.length === given.length && timingSafeEqual(expected, given)
  }
  if (matches) {
    await payload.kv.delete(failKey(address))
    return { ok: true }
  }

  own.count++
  all.count++
  if (own.count >= PER_ADDRESS_LIMIT) {
    own.lockedUntil = Date.now() + PER_ADDRESS_LOCK_MS
    own.count = 0
  }
  if (all.count >= GLOBAL_LIMIT) {
    all.lockedUntil = Date.now() + GLOBAL_WINDOW_MS
    all.count = 0
  }
  await payload.kv.set(failKey(address), own)
  await payload.kv.set(GLOBAL_KEY, all)
  payload.logger.warn(`Admin gate: wrong pattern (${own.count}/${PER_ADDRESS_LIMIT} for this address)`)

  const nowLocked = Math.max(own.lockedUntil, known ? 0 : all.lockedUntil)
  if (nowLocked > Date.now()) {
    return { ok: false, reason: 'locked', retryInSeconds: Math.ceil((nowLocked - Date.now()) / 1000) }
  }
  return { ok: false, reason: 'wrong', triesLeft: PER_ADDRESS_LIMIT - own.count }
}
