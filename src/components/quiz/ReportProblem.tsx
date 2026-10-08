'use client'

import Link from 'next/link'
import React, { useId, useState } from 'react'

import { FlagIcon } from './ui'

// Small "Report a problem" link shown on every question.
export function ReportProblem({ questionId, isGuest, loginNext }: { questionId: number; isGuest: boolean; loginNext: string }) {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [error, setError] = useState('')
  const id = useId()

  if (state === 'sent') {
    return <p className="m-0 text-[13px] font-semibold text-[#067647]">Thanks. We will review this question.</p>
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex w-fit items-center gap-1.5 text-[13px] font-semibold text-[#475467] hover:text-[#0B1220] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2B44E8]"
      >
        <FlagIcon size={14} />
        Report a problem
      </button>
      {open &&
        (isGuest ? (
          <p className="m-0 text-[13px] text-[#475467]">
            <Link href={`/login?next=${encodeURIComponent(loginNext)}`} className="font-semibold text-[#2B44E8]">
              Log in
            </Link>{' '}
            to report a problem with this question.
          </p>
        ) : (
          <form
            className="flex flex-col gap-2"
            onSubmit={async (e) => {
              e.preventDefault()
              setState('sending')
              setError('')
              const res = await fetch('/api/quiz/report', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ questionId, message }),
              })
              const json = await res.json().catch(() => ({}))
              if (res.ok) setState('sent')
              else {
                setError(json.error || 'Could not send the report.')
                setState('idle')
              }
            }}
          >
            <label htmlFor={id} className="text-[13px] font-semibold text-[#344054]">
              What is wrong with this question?
            </label>
            <textarea
              id={id}
              required
              minLength={5}
              maxLength={2000}
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="rounded-[10px] border border-[#D0D5DD] bg-white p-3 text-sm text-[#0B1220] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2B44E8]"
            />
            {error && (
              <p role="alert" className="m-0 text-[13px] font-semibold text-[#B42318]">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={state === 'sending'}
              className="h-9 w-fit rounded-[10px] bg-[#0B1220] px-4 text-[13px] font-bold text-white disabled:opacity-60"
            >
              {state === 'sending' ? 'Sending...' : 'Send report'}
            </button>
          </form>
        ))}
    </div>
  )
}
