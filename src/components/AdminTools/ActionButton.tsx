'use client'

import React, { useState } from 'react'

// A button that calls one of the /api/admin-tools endpoints and refreshes the
// page. Shows the server's message (e.g. what is missing to publish) on failure.
export function ActionButton({
  endpoint,
  payload,
  label,
  busyLabel = 'Saving…',
  confirm,
  variant = 'default',
}: {
  endpoint: string
  payload: Record<string, unknown>
  label: string
  busyLabel?: string
  confirm?: string
  variant?: 'default' | 'primary' | 'danger'
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const run = async () => {
    if (confirm && !window.confirm(confirm)) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`/api/admin-tools/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) setError(data.error || 'Something went wrong. Please try again.')
      // A full reload: the admin's own page cache would otherwise keep showing the old state.
      else window.location.reload()
    } catch {
      setError('Could not reach the site. Check your connection and try again.')
    }
    setBusy(false)
  }

  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column' }}>
      <button
        type="button"
        onClick={run}
        disabled={busy}
        className={`cg-tools__btn${variant === 'primary' ? ' cg-tools__btn--primary' : variant === 'danger' ? ' cg-tools__btn--danger' : ''}`}
      >
        {busy ? busyLabel : label}
      </button>
      {error && (
        <span role="alert" className="cg-tools__error" style={{ maxWidth: 420 }}>
          {error}
        </span>
      )}
    </span>
  )
}
