'use client'

import { useRouter } from 'next/navigation'
import React, { useState } from 'react'

import { secondaryButton } from './ui'

// Starts a practice session made of the questions missed in an exam.
export function PracticeMissedButton({ certSlug, attemptId, count }: { certSlug: string; attemptId: number; count: number }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={busy}
        className={`${secondaryButton} h-[52px] text-[15px] font-bold`}
        onClick={async () => {
          setBusy(true)
          setError('')
          const res = await fetch('/api/quiz/practice/start', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ certSlug, fromAttempt: attemptId }),
          })
          const json = await res.json().catch(() => ({}))
          if (res.ok) router.push(`/certifications/${certSlug}/practice?session=${json.attemptId}`)
          else {
            setError(json.error || 'Could not start practice.')
            setBusy(false)
          }
        }}
      >
        {busy ? 'Starting...' : `Practice ${count} missed question${count === 1 ? '' : 's'}`}
      </button>
      {error && (
        <span role="alert" className="text-[13px] font-semibold text-[#B42318]">
          {error}
        </span>
      )}
    </div>
  )
}
