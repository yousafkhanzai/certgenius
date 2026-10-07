import { createHash } from 'crypto'

// Fingerprint used to stop the same question being saved twice for one
// certification - case, spacing and surrounding whitespace don't count as different.
export function questionHash(certificationId: number | string, questionText: string): string {
  const normalized = questionText.trim().toLowerCase().replace(/\s+/g, ' ')
  return createHash('sha256').update(`${certificationId}|${normalized}`).digest('hex')
}
