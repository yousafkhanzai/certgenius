'use client'

import React, { useEffect, useState } from 'react'

import { PatternPad } from './PatternPad'

// The pattern screen shown before the admin login page.
export function GateClient() {
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [lockedFor, setLockedFor] = useState(0)
  const [resetKey, setResetKey] = useState(0)

  useEffect(() => {
    if (lockedFor <= 0) return
    const timer = setInterval(() => setLockedFor((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(timer)
  }, [lockedFor])

  const check = async (pattern: string) => {
    setBusy(true)
    setMessage('')
    try {
      const res = await fetch('/api/admin-gate/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ pattern }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.ok) {
        window.location.href = '/admin/login'
        return
      }
      if (data.reason === 'locked') {
        setLockedFor(Number(data.retryInSeconds) || 900)
        setMessage('Too many wrong tries.')
      } else if (data.reason === 'wrong') {
        setMessage(`Wrong pattern. ${data.triesLeft} ${data.triesLeft === 1 ? 'try' : 'tries'} left.`)
      } else {
        setMessage('Something went wrong. Please try again.')
      }
    } catch {
      setMessage('Could not reach the site. Check your connection and try again.')
    }
    setResetKey((k) => k + 1)
    setBusy(false)
  }

  const minutes = Math.floor(lockedFor / 60)
  const seconds = String(lockedFor % 60).padStart(2, '0')

  return (
    <div>
      <PatternPad onComplete={check} disabled={busy || lockedFor > 0} resetKey={resetKey} />
      <p role="alert" style={{ minHeight: 24, marginTop: 8, textAlign: 'center', fontSize: 14, color: '#FDA29B' }}>
        {message}
        {lockedFor > 0 ? ` Try again in ${minutes}:${seconds}.` : ''}
      </p>
    </div>
  )
}
