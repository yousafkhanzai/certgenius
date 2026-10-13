'use client'

import Link from 'next/link'
import React, { useEffect, useState } from 'react'

import type { Feedback, Letter, PublicQuestion } from '@/quiz/types'

// Homepage "Try a question" card: a real question from a certification's free
// questions, answerable without logging in, with a ticking timer.
export function TryQuestion({ question, cert }: { question: PublicQuestion; cert: { slug: string; title: string } }) {
  const [seconds, setSeconds] = useState(0)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (feedback) return
    const t = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [feedback])

  const answer = async (choice: Letter) => {
    if (feedback || busy) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/quiz/practice/answer', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ certSlug: cert.slug, questionId: question.id, choice }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setFeedback(json.feedback)
    } catch {
      setError('Could not check your answer. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const clock = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`

  return (
    <section aria-label="Try a question" className="flex flex-col gap-4 rounded-[24px] bg-white p-5 text-[#0B1220] shadow-[0_24px_60px_-20px_rgba(0,0,0,0.5)] sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate text-[13px] font-bold text-[#0B1220]">{cert.title}</span>
          <span className="hidden truncate text-[13px] font-medium text-[#475467] sm:inline">· {question.domain}</span>
        </span>
        <span role="timer" aria-label={`Time on this question ${clock}`} className="flex-none rounded-lg bg-[#F2F4F7] px-2.5 py-1 font-mono text-sm font-semibold">
          {clock}
        </span>
      </div>
      <h2 className="m-0 text-lg font-semibold leading-[1.4] tracking-[-0.01em]">{question.text}</h2>
      <div className="flex flex-col gap-2">
        {question.options.map((o) => {
          const right = feedback?.correct === o.letter
          const wrong = feedback && feedback.chosen === o.letter && !right
          return (
            <button
              key={o.letter}
              type="button"
              disabled={Boolean(feedback) || busy}
              onClick={() => answer(o.letter)}
              className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-[15px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2B44E8] ${
                right
                  ? 'border-2 border-[#079455] bg-[#F6FEF9]'
                  : wrong
                    ? 'border-2 border-[#D92D20] bg-[#FFFBFA]'
                    : 'border border-[#D0D5DD] bg-white enabled:hover:border-[#2B44E8] enabled:hover:bg-[#EEF1FF]'
              }`}
            >
              <span
                className={`flex h-7 w-7 flex-none items-center justify-center rounded-lg text-[13px] font-bold ${
                  right ? 'bg-[#079455] text-white' : wrong ? 'bg-[#D92D20] text-white' : 'bg-[#F2F4F7] text-[#344054]'
                }`}
              >
                {o.letter}
              </span>
              <span className="leading-snug">{o.text}</span>
            </button>
          )
        })}
      </div>
      {error && (
        <p role="alert" className="m-0 text-sm font-semibold text-[#B42318]">
          {error}
        </p>
      )}
      {feedback ? (
        <div className="flex flex-col gap-3" aria-live="polite">
          <p className="m-0 text-sm leading-relaxed text-[#344054]">
            <strong className={feedback.isCorrect ? 'text-[#067647]' : 'text-[#B42318]'}>
              {feedback.isCorrect ? 'Correct.' : `Not quite: the answer is ${feedback.correct}.`}
            </strong>{' '}
            {feedback.explanation}
          </p>
          <Link
            href={`/certifications/${cert.slug}/quiz`}
            className="flex h-11 items-center justify-center rounded-xl bg-[#2B44E8] text-sm font-bold text-white no-underline hover:bg-[#1A2DB0] hover:text-white"
          >
            Keep practising {cert.title}
          </Link>
        </div>
      ) : (
        <p className="m-0 text-[13px] text-[#475467]">Pick an answer. No sign-up needed.</p>
      )}
    </section>
  )
}
