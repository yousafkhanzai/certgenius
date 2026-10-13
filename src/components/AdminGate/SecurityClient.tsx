'use client'

import React, { useState } from 'react'

import { PatternPad } from './PatternPad'

type Step = 'current' | 'new' | 'confirm' | 'done'

// Admin > Admin security: draw a new pattern twice (and the current one first
// when changing it).
export function SecurityClient({ hasPattern }: { hasPattern: boolean }) {
  const [step, setStep] = useState<Step>(hasPattern ? 'current' : 'new')
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [resetKey, setResetKey] = useState(0)

  const restart = (text: string) => {
    setMessage(text)
    setCurrent('')
    setNext('')
    setStep(hasPattern ? 'current' : 'new')
    setResetKey((k) => k + 1)
  }

  const save = async (pattern: string) => {
    setBusy(true)
    try {
      const res = await fetch('/api/admin-gate/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ pattern, current }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.ok) {
        setMessage('')
        setStep('done')
      } else if (data.reason === 'wrong') {
        restart('The current pattern was wrong. Nothing was changed.')
      } else if (data.reason === 'locked') {
        restart(`Too many wrong tries. Try again in ${Math.ceil((Number(data.retryInSeconds) || 900) / 60)} minutes.`)
      } else {
        restart(data.error || 'Something went wrong. Nothing was changed.')
      }
    } catch {
      restart('Could not reach the site. Nothing was changed.')
    }
    setBusy(false)
  }

  const onPattern = (pattern: string) => {
    setMessage('')
    if (step === 'current') {
      setCurrent(pattern)
      setStep('new')
    } else if (step === 'new') {
      setNext(pattern)
      setStep('confirm')
    } else if (step === 'confirm') {
      if (pattern !== next) return restart('The two patterns did not match. Please start again.')
      void save(pattern)
      return
    }
    setResetKey((k) => k + 1)
  }

  if (step === 'done') {
    return (
      <p style={{ padding: '1rem', borderRadius: 12, background: '#ECFDF3', color: '#067647', fontWeight: 600 }}>
        Pattern saved. From now on the admin login page only appears after this pattern is drawn.
      </p>
    )
  }

  const title =
    step === 'current' ? 'Step 1: draw your CURRENT pattern' : step === 'new' ? 'Draw your NEW pattern' : 'Draw the new pattern again to confirm'

  return (
    <div style={{ maxWidth: 340 }}>
      <h3 style={{ margin: '0 0 1rem' }}>{title}</h3>
      <PatternPad onComplete={onPattern} disabled={busy} resetKey={resetKey} />
      <p role="alert" style={{ minHeight: 24, marginTop: 8, color: '#B42318', fontWeight: 600 }}>
        {message}
      </p>
    </div>
  )
}
