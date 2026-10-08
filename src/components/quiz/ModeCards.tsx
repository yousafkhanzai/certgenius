'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { useState } from 'react'

import { BulbIcon, CheckIcon, TimerIcon, card, formatClock } from './ui'

type Domain = { name: string; questions: number; mastered: number }

async function post(url: string, data: unknown) {
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || 'Something went wrong. Please try again.')
  return json
}

export function useStartPractice(certSlug: string, loggedIn: boolean) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const start = async (domain: string | null, count: number) => {
    if (!loggedIn) {
      router.push(`/certifications/${certSlug}/practice`)
      return
    }
    setBusy(true)
    setError('')
    try {
      const { attemptId } = await post('/api/quiz/practice/start', { certSlug, domain, count })
      router.push(`/certifications/${certSlug}/practice?session=${attemptId}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start practice.')
      setBusy(false)
    }
  }
  return { start, busy, error }
}

export function ModeCards({
  certSlug,
  loggedIn,
  domains,
  examQuestions,
  examMinutes,
  passScore,
  unfinishedExam,
}: {
  certSlug: string
  loggedIn: boolean
  domains: Domain[]
  examQuestions: number
  examMinutes: number
  passScore: number
  unfinishedExam: { id: number; secondsLeft: number } | null
}) {
  const router = useRouter()
  const [domain, setDomain] = useState('')
  const [count, setCount] = useState(25)
  const practice = useStartPractice(certSlug, loggedIn)
  const [examBusy, setExamBusy] = useState(false)
  const [examError, setExamError] = useState('')

  const startExam = async () => {
    if (!loggedIn) {
      router.push(`/signup?next=${encodeURIComponent(`/certifications/${certSlug}/quiz`)}`)
      return
    }
    setExamBusy(true)
    setExamError('')
    try {
      const { attemptId } = await post('/api/quiz/exam/start', { certSlug })
      router.push(`/certifications/${certSlug}/exam/${attemptId}`)
    } catch (e) {
      setExamError(e instanceof Error ? e.message : 'Could not start the exam.')
      setExamBusy(false)
    }
  }

  const counts: { label: string; value: number }[] = [
    { label: '10', value: 10 },
    { label: '25', value: 25 },
    { label: '50', value: 50 },
    { label: 'All', value: 0 },
  ]

  return (
    <section aria-label="Choose a mode" className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,360px),1fr))]">
      {/* Practice */}
      <div className={`${card} flex flex-col gap-4 p-[26px]`}>
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FFFAEB] text-[#B54708]">
          <BulbIcon size={22} />
        </span>
        <div className="flex flex-col gap-1.5">
          <h2 className="m-0 text-[22px] font-bold tracking-[-0.02em]">Practice</h2>
          <p className="m-0 text-[15px] leading-[1.55] text-[#475467]">
            Learn as you go with hints, instant explanations and a study guide for every question.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="pdomain" className="text-[13px] font-semibold text-[#344054]">
            Domain
          </label>
          <select
            id="pdomain"
            value={domain}
            disabled={!loggedIn}
            onChange={(e) => setDomain(e.target.value)}
            className="h-11 rounded-[10px] border border-[#D0D5DD] bg-white px-3 text-[15px] text-[#0B1220] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2B44E8] disabled:opacity-60"
          >
            <option value="">All domains</option>
            {domains.map((d) => (
              <option key={d.name} value={d.name}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div role="group" aria-label="Number of questions" className="grid grid-cols-4 gap-1.5 rounded-xl bg-[#F2F4F7] p-1">
          {counts.map((c) => {
            const on = count === c.value
            return (
              <button
                key={c.label}
                type="button"
                aria-pressed={on}
                disabled={!loggedIn}
                onClick={() => setCount(c.value)}
                className={`h-10 rounded-[9px] text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2B44E8] disabled:opacity-60 ${
                  on ? 'bg-white font-bold text-[#0B1220] shadow-[0_1px_3px_rgba(16,24,40,0.12)]' : 'bg-transparent font-semibold text-[#475467]'
                }`}
              >
                {c.label}
              </button>
            )
          })}
        </div>
        {!loggedIn && (
          <p className="m-0 text-[13px] leading-normal text-[#475467]">
            Try the first 10 questions free.{' '}
            <Link href={`/signup?next=${encodeURIComponent(`/certifications/${certSlug}/quiz`)}`} className="font-semibold text-[#2B44E8]">
              Sign up
            </Link>{' '}
            to pick a domain and save your progress.
          </p>
        )}
        {practice.error && (
          <p role="alert" className="m-0 text-sm font-semibold text-[#B42318]">
            {practice.error}
          </p>
        )}
        <button
          type="button"
          disabled={practice.busy}
          onClick={() => practice.start(domain || null, count)}
          className="mt-auto flex h-[50px] items-center justify-center rounded-xl border-[1.5px] border-[#0B1220] bg-white text-[15px] font-bold text-[#0B1220] hover:bg-[#F6F7F9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2B44E8] disabled:opacity-60"
        >
          {practice.busy ? 'Starting...' : loggedIn ? 'Start practice' : 'Try 10 free questions'}
        </button>
      </div>

      {/* Exam simulation */}
      <div className="flex flex-col gap-4 rounded-[20px] border-2 border-[#2B44E8] bg-white p-[26px] shadow-[0_12px_32px_-12px_rgba(43,68,232,0.35)]">
        <div className="flex items-start justify-between gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EEF1FF] text-[#2B44E8]">
            <TimerIcon size={22} />
          </span>
          <span className="rounded-full bg-[#EEF1FF] px-2.5 py-[5px] text-xs font-bold text-[#2B44E8]">RECOMMENDED</span>
        </div>
        <div className="flex flex-col gap-1.5">
          <h2 className="m-0 text-[22px] font-bold tracking-[-0.02em]">Exam simulation</h2>
          <p className="m-0 text-[15px] leading-[1.55] text-[#475467]">
            The real exam experience: same number of questions, timer and pass score. Full review at the end.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            ['Questions', String(examQuestions)],
            ['Timer', `${String(examMinutes).padStart(2, '0')}:00`],
            ['Pass', `${passScore}%`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-[#F6F7F9] p-3">
              <div className="text-xs text-[#475467]">{label}</div>
              <div className="text-xl font-bold">{value}</div>
            </div>
          ))}
        </div>
        <ul className="m-0 flex list-none flex-col gap-2 p-0 text-sm text-[#344054]">
          {['Bookmark and cross out answers', 'Domain-by-domain results and study plan'].map((t) => (
            <li key={t} className="flex items-center gap-2">
              <CheckIcon size={16} strokeWidth={2.6} className="text-[#067647]" />
              {t}
            </li>
          ))}
        </ul>
        {examError && (
          <p role="alert" className="m-0 text-sm font-semibold text-[#B42318]">
            {examError}
          </p>
        )}
        <button
          type="button"
          disabled={examBusy}
          onClick={unfinishedExam ? () => router.push(`/certifications/${certSlug}/exam/${unfinishedExam.id}`) : startExam}
          className="mt-auto flex h-[50px] items-center justify-center rounded-xl bg-[#2B44E8] text-[15px] font-bold text-white hover:bg-[#1A2DB0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2B44E8] disabled:opacity-60"
        >
          {examBusy
            ? 'Starting...'
            : unfinishedExam
              ? `Resume exam (${formatClock(unfinishedExam.secondsLeft)} left)`
              : loggedIn
                ? 'Start exam'
                : 'Sign up to take the exam'}
        </button>
      </div>
    </section>
  )
}

export function MasteryCards({
  certSlug,
  loggedIn,
  domains,
}: {
  certSlug: string
  loggedIn: boolean
  domains: Domain[]
}) {
  const practice = useStartPractice(certSlug, loggedIn)
  return (
    <section aria-label="Domain mastery" className={`${card} flex flex-col gap-5 p-7 shadow-none`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="m-0 text-xl font-bold tracking-[-0.02em]">Your mastery by domain</h2>
        <span className="text-[13px] text-[#475467]">
          {loggedIn ? 'Mastered = answered correctly twice in a row' : 'Log in to track your mastery'}
        </span>
      </div>
      {practice.error && (
        <p role="alert" className="m-0 text-sm font-semibold text-[#B42318]">
          {practice.error}
        </p>
      )}
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
        {domains.map((d) => {
          const pct = d.questions ? Math.round((d.mastered / d.questions) * 100) : 0
          return (
            <button
              key={d.name}
              type="button"
              disabled={practice.busy || d.questions === 0}
              onClick={() => practice.start(d.name, 25)}
              className="flex flex-col gap-3 rounded-[14px] border border-[#E4E7EC] bg-white p-4 text-left text-[#0B1220] hover:border-[#2B44E8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2B44E8] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="min-h-[38px] text-sm font-semibold leading-[1.35]">{d.name}</span>
              <span className="flex items-baseline gap-1.5">
                <span className="text-[26px] font-extrabold tracking-[-0.03em]">{pct}%</span>
                <span className="text-[13px] text-[#475467]">
                  {d.mastered} of {d.questions}
                </span>
              </span>
              <span className="block h-1.5 rounded-full bg-[#EEF0F3]">
                <span
                  className="block h-1.5 rounded-full"
                  style={{ width: `${pct}%`, background: pct < 60 ? '#DC6803' : '#2B44E8' }}
                />
              </span>
              <span className="text-[13px] font-semibold text-[#2B44E8]">
                {d.questions === 0 ? 'No questions yet' : 'Practice this domain'}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
