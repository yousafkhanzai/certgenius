'use client'

import { useRouter } from 'next/navigation'
import React, { useCallback, useEffect, useRef, useState } from 'react'

import { LETTERS, type ExamResponses, type Letter, type PublicQuestion } from '@/quiz/types'
import { BookmarkButton } from './PracticeSession'
import { ChevronLeft, ChevronRight, CrossOutIcon, Kbd, LogoMark, TimerIcon, card, primaryButton, secondaryButton } from './ui'

type Props = {
  attemptId: number
  cert: { slug: string; title: string; examCode: string | null }
  questions: PublicQuestion[]
  initialResponses: ExamResponses
  initialIndex: number
  deadline: string // ISO
  serverNow: number // ms, to correct for a wrong clock on the student's computer
  durationSeconds: number
}

const PALETTES = {
  ok: { bg: '#0B1220', fg: '#FFFFFF', label: '#98A2B3', track: '#1F2A3D', bar: '#7CF2B0', note: '#C2C9D6', border: '#344054', head: '#0B1220', accent: '#7CF2B0' },
  amber: { bg: '#FFFAEB', fg: '#7A2E0E', label: '#93370D', track: '#FEDF89', bar: '#DC6803', note: '#7A2E0E', border: '#FEC84B', head: '#DC6803', accent: '#FFFFFF' },
  red: { bg: '#FEF3F2', fg: '#7A271A', label: '#912018', track: '#FECDCA', bar: '#D92D20', note: '#7A271A', border: '#FDA29B', head: '#D92D20', accent: '#FFFFFF' },
}

export function ExamSession(props: Props) {
  const { attemptId, cert, questions, durationSeconds } = props
  const router = useRouter()
  const total = questions.length
  const deadlineMs = new Date(props.deadline).getTime()
  const offset = useRef(props.serverNow - Date.now())
  const remainingNow = () => Math.max(0, Math.floor((deadlineMs - (Date.now() + offset.current)) / 1000))

  const [index, setIndex] = useState(Math.min(Math.max(props.initialIndex, 0), total - 1))
  const [responses, setResponses] = useState<ExamResponses>(props.initialResponses)
  // Same starting value on the server and in the browser (no hydration
  // mismatch); the interval below then follows the real clock.
  const [left, setLeft] = useState(() => Math.max(0, Math.floor((deadlineMs - props.serverNow) / 1000)))
  const [hidden, setHidden] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'offline'>('saved')
  const [crossMode, setCrossMode] = useState(false)
  const submitted = useRef(false)
  const dirty = useRef(false)
  const enteredAt = useRef(Date.now())
  const latest = useRef({ responses, index })
  latest.current = { responses, index }

  const q = questions[index]
  const r = responses[String(q.id)] || {}
  const answered = questions.filter((x) => responses[String(x.id)]?.c).length
  const unanswered = total - answered

  // Time spent on each question (used for "average per question" on the results).
  const commitTime = useCallback(() => {
    const id = String(questions[latest.current.index]?.id)
    const spent = Date.now() - enteredAt.current
    enteredAt.current = Date.now()
    if (!id || spent <= 0) return latest.current.responses
    const next = { ...latest.current.responses, [id]: { ...latest.current.responses[id], t: (latest.current.responses[id]?.t || 0) + spent } }
    latest.current.responses = next
    return next
  }, [questions])

  const update = (id: number, change: (prev: ExamResponses[string]) => ExamResponses[string]) => {
    dirty.current = true
    setResponses((all) => ({ ...all, [String(id)]: change(all[String(id)] || {}) }))
  }

  const save = useCallback(
    async (keepalive = false) => {
      if (submitted.current) return
      const payload = { attemptId, responses: commitTime(), currentIndex: latest.current.index }
      setResponses(payload.responses)
      dirty.current = false
      setSaveState('saving')
      try {
        const res = await fetch('/api/quiz/exam/save', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive,
        })
        setSaveState(res.ok ? 'saved' : 'offline')
      } catch {
        dirty.current = true
        setSaveState('offline')
      }
    },
    [attemptId, commitTime],
  )

  const submit = useCallback(async () => {
    if (submitted.current) return
    submitted.current = true
    setSubmitting(true)
    const finalResponses = commitTime()
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch('/api/quiz/exam/submit', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ attemptId, responses: finalResponses }),
        })
        const json = await res.json()
        if (res.ok && json.url) {
          router.replace(json.url)
          return
        }
      } catch {
        // retry below
      }
      await new Promise((r) => setTimeout(r, 1500))
    }
    submitted.current = false
    setSubmitting(false)
    setSaveState('offline')
  }, [attemptId, commitTime, router])

  // Countdown; auto-submit at 00:00.
  useEffect(() => {
    const tick = setInterval(() => {
      const s = remainingNow()
      setLeft(s)
      if (s <= 0) void submit()
    }, 1000)
    return () => clearInterval(tick)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submit])

  // Save progress continuously: shortly after each change, every 15 seconds,
  // and when the tab is hidden or closed - so a refresh resumes exactly here.
  useEffect(() => {
    if (!dirty.current) return
    const t = setTimeout(() => void save(), 1200)
    return () => clearTimeout(t)
  }, [responses, index, save])
  useEffect(() => {
    const every = setInterval(() => void save(), 15_000)
    const onHide = () => {
      if (document.visibilityState === 'hidden') void save(true)
    }
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', onHide)
    return () => {
      clearInterval(every)
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', onHide)
    }
  }, [save])

  const goTo = useCallback(
    (i: number) => {
      if (i < 0 || i >= total) return
      setResponses(commitTime())
      dirty.current = true
      setCrossMode(false)
      setIndex(i)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    [commitTime, total],
  )

  const pick = (letter: Letter) =>
    update(q.id, (p) => ({ ...p, c: letter, x: (p.x || []).filter((l) => l !== letter) }))

  const crossOut = (letter: Letter) =>
    update(q.id, (p) => {
      const out = (p.x || []).includes(letter)
      return { ...p, x: out ? (p.x || []).filter((l) => l !== letter) : [...(p.x || []), letter], c: p.c === letter ? undefined : p.c }
    })

  const toggleBookmark = () => {
    const on = !r.b
    update(q.id, (p) => ({ ...p, b: on }))
    void fetch('/api/quiz/bookmark', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId: q.id, on }),
    }).catch(() => undefined)
  }

  // Keyboard: 1-4 choose, X then 1-4 (or X on a focused option) crosses out,
  // B bookmark, Enter / right arrow next, left arrow previous.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (confirming || submitting || target.closest('input, textarea, select') || e.metaKey || e.ctrlKey || e.altKey) return
      const key = e.key.toLowerCase()
      if (['1', '2', '3', '4'].includes(key)) {
        e.preventDefault()
        const letter = LETTERS[Number(key) - 1]
        if (crossMode) {
          crossOut(letter)
          setCrossMode(false)
        } else pick(letter)
      } else if (key === 'x') {
        e.preventDefault()
        const focused = target.closest('[data-option]')?.getAttribute('data-option') as Letter | null
        if (focused) crossOut(focused)
        else setCrossMode((m) => !m)
      } else if (key === 'b') {
        e.preventDefault()
        toggleBookmark()
      } else if ((key === 'enter' && !(target instanceof HTMLButtonElement)) || key === 'arrowright') {
        e.preventDefault()
        if (index + 1 < total) goTo(index + 1)
        else setConfirming(true)
      } else if (key === 'arrowleft') {
        e.preventDefault()
        goTo(index - 1)
      } else if (key === 'escape') {
        setCrossMode(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const level = left <= 300 ? 'red' : left <= 600 ? 'amber' : 'ok'
  const pal = PALETTES[level]
  // MM:SS with total minutes (a 90-minute exam reads 89:38, not 1:29:38).
  const mm = String(Math.floor(left / 60)).padStart(2, '0')
  const ss = String(left % 60).padStart(2, '0')
  const clock = `${mm}:${ss}`
  const totalClock = `${String(Math.floor(durationSeconds / 60)).padStart(2, '0')}:${String(durationSeconds % 60).padStart(2, '0')}`
  const perQuestion = unanswered ? Math.floor(left / unanswered) : null
  const note =
    level === 'red'
      ? 'Under 5 minutes left. The exam submits automatically at 00:00.'
      : level === 'amber'
        ? 'Under 10 minutes left. Keep a steady pace.'
        : perQuestion !== null
          ? `About ${perQuestion}s for each of the ${unanswered} questions left. Submits automatically at 00:00.`
          : 'All questions answered. Review them or submit when ready.'

  return (
    <div className="min-h-screen bg-[#F6F7F9] font-sans text-[#0B1220]">
      <header className="border-b border-[#E4E7EC] bg-white">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-center gap-3.5">
            <LogoMark />
            <div className="flex flex-col">
              <span className="text-[15px] font-bold tracking-[-0.01em]">{cert.title}</span>
              <span className="text-[13px] text-[#475467]">Exam simulation{cert.examCode ? ` · ${cert.examCode}` : ''}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <div
              role="timer"
              aria-label={`Time remaining ${clock}`}
              className="flex h-11 items-center gap-2.5 rounded-xl px-3.5 text-white"
              style={{ background: pal.head }}
            >
              <TimerIcon className="shrink-0" size={18} />
              <span className="font-mono text-[19px] font-semibold">{hidden ? 'Hidden' : clock}</span>
            </div>
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="flex h-11 items-center rounded-xl border-[1.5px] border-[#0B1220] bg-white px-[18px] text-sm font-bold text-[#0B1220] hover:bg-[#F6F7F9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2B44E8]"
            >
              Submit exam
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-[1240px] flex-wrap items-start gap-6 px-4 pb-16 pt-7 sm:px-6">
        <div className="flex min-w-0 flex-[999_1_600px] flex-col gap-4">
          <div className="flex items-center gap-3.5">
            <span className="whitespace-nowrap text-sm font-semibold">
              Question {index + 1} <span className="font-medium text-[#475467]">of {total}</span>
            </span>
            <span className="block h-1.5 flex-1 rounded-full bg-[#E4E7EC]">
              <span className="block h-1.5 rounded-full bg-[#2B44E8]" style={{ width: `${((index + 1) / total) * 100}%` }} />
            </span>
            <span className="hidden whitespace-nowrap text-[13px] text-[#475467] sm:inline">
              {perQuestion !== null ? `On pace: ${perQuestion}s per question` : `${answered} of ${total} answered`}
            </span>
          </div>

          {confirming && (
            <section role="alertdialog" aria-labelledby="confirm-title" className={`${card} flex flex-col gap-3 border-2 border-[#2B44E8] p-6`}>
              <h2 id="confirm-title" className="m-0 text-lg font-bold">
                Submit your exam?
              </h2>
              <p className="m-0 text-[15px] text-[#475467]">
                {unanswered
                  ? `You have ${unanswered} unanswered question${unanswered === 1 ? '' : 's'}. Unanswered questions count as wrong.`
                  : 'You have answered every question.'}
              </p>
              <div className="flex flex-wrap gap-2.5">
                <button type="button" disabled={submitting} onClick={() => void submit()} className={`${primaryButton} h-11 text-sm`}>
                  {submitting ? 'Submitting...' : 'Submit and see results'}
                </button>
                <button type="button" disabled={submitting} onClick={() => setConfirming(false)} className={`${secondaryButton} h-11 text-sm`}>
                  Keep going
                </button>
              </div>
            </section>
          )}

          <section className={`${card} flex flex-col gap-6 p-5 sm:p-8`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="rounded-full bg-[#F2F4F7] px-2.5 py-1.5 text-[13px] font-semibold text-[#344054]">{q.domain}</span>
              <BookmarkButton on={Boolean(r.b)} onClick={toggleBookmark} />
            </div>

            <h1 className="m-0 whitespace-pre-line text-[21px] font-semibold leading-[1.4] tracking-[-0.02em] sm:text-[26px]">{q.text}</h1>

            <div className="flex flex-col gap-2.5" role="group" aria-label="Answer options">
              {q.options.map((o, i) => {
                const selected = r.c === o.letter
                const out = (r.x || []).includes(o.letter)
                return (
                  <div key={o.letter} className="flex items-stretch gap-2">
                    <button
                      type="button"
                      data-option={o.letter}
                      aria-pressed={selected}
                      aria-keyshortcuts={String(i + 1)}
                      onClick={() => pick(o.letter)}
                      className={`flex min-h-[62px] flex-1 items-center gap-3.5 rounded-[14px] px-4 py-3 text-left text-[#0B1220] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2B44E8] ${
                        selected ? 'border-2 border-[#2B44E8] bg-[#EEF1FF]' : 'border border-[#D0D5DD] bg-white hover:border-[#98A2B3]'
                      } ${out ? 'opacity-55' : ''}`}
                    >
                      <span
                        className={`flex h-8 w-8 flex-none items-center justify-center rounded-[9px] text-sm font-bold ${
                          selected ? 'bg-[#2B44E8] text-white' : 'bg-[#F2F4F7] text-[#344054]'
                        }`}
                      >
                        {o.letter}
                      </span>
                      <span className={`text-base leading-normal ${out ? 'text-[#475467] line-through' : ''}`}>{o.text}</span>
                    </button>
                    <button
                      type="button"
                      data-option={o.letter}
                      onClick={() => crossOut(o.letter)}
                      aria-pressed={out}
                      aria-label={`${out ? 'Restore' : 'Cross out'} option ${o.letter}`}
                      title="Cross out"
                      className={`flex w-12 flex-none items-center justify-center rounded-[14px] border focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2B44E8] ${
                        out ? 'border-[#0B1220] bg-[#0B1220] text-white' : 'border-[#E4E7EC] bg-white text-[#475467] hover:border-[#98A2B3]'
                      }`}
                    >
                      <CrossOutIcon />
                    </button>
                  </div>
                )
              })}
            </div>
            {crossMode && <p className="m-0 text-[13px] font-semibold text-[#2B44E8]">Cross-out mode: press 1–4 to cross out an option.</p>}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <button type="button" disabled={index === 0} onClick={() => goTo(index - 1)} className={`${secondaryButton} h-12 text-[15px]`}>
                <ChevronLeft />
                Previous
              </button>
              {index + 1 < total ? (
                <button type="button" onClick={() => goTo(index + 1)} className={`${primaryButton} h-12 text-[15px]`}>
                  Next<span className="hidden sm:inline"> question</span>
                  <ChevronRight />
                </button>
              ) : (
                <button type="button" onClick={() => setConfirming(true)} className={`${primaryButton} h-12 text-[15px]`}>
                  Finish exam
                  <ChevronRight />
                </button>
              )}
            </div>
          </section>

          <div aria-label="Keyboard shortcuts" className="flex flex-wrap gap-[18px] text-[13px] text-[#475467]">
            <span>
              <Kbd>1</Kbd>–<Kbd>4</Kbd> choose answer
            </span>
            <span>
              <Kbd>B</Kbd> bookmark
            </span>
            <span>
              <Kbd>X</Kbd> cross out
            </span>
            <span>
              <Kbd>Enter</Kbd> next
            </span>
            <span>
              <Kbd>←</Kbd> <Kbd>→</Kbd> previous / next
            </span>
            <span className="ml-auto" aria-live="polite">
              {saveState === 'saving' ? 'Saving...' : saveState === 'offline' ? 'Not saved: check your connection' : 'Progress saved'}
            </span>
          </div>
        </div>

        <div className="flex flex-[1_1_300px] flex-col gap-4">
          <section
            aria-label="Countdown"
            className="flex flex-col gap-2.5 rounded-[20px] p-[22px]"
            style={{ background: pal.bg, color: pal.fg, border: level === 'ok' ? undefined : `1.5px solid ${pal.border}` }}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold tracking-[0.08em]" style={{ color: pal.label }}>
                TIME REMAINING
              </span>
              <button
                type="button"
                onClick={() => setHidden(!hidden)}
                aria-pressed={hidden}
                className="h-8 rounded-lg border bg-transparent px-2.5 text-xs font-semibold"
                style={{ borderColor: pal.border, color: pal.label }}
              >
                {hidden ? 'Show' : 'Hide'}
              </button>
            </div>
            <div role="timer" aria-live="off" aria-label={`Time remaining ${clock}`} className="flex items-baseline gap-0.5 font-mono font-semibold leading-none">
              <span className="text-[56px] tracking-[-0.04em]">{hidden ? '--' : mm}</span>
              <span className="px-0.5 text-[44px] opacity-60">:</span>
              <span className="text-[56px] tracking-[-0.04em]">{hidden ? '--' : ss}</span>
            </div>
            <div className="flex justify-between text-xs" style={{ color: pal.label }}>
              <span>min</span>
              <span>of {totalClock}</span>
            </div>
            <span className="block h-2 rounded-full" style={{ background: pal.track }}>
              <span
                className="block h-2 rounded-full"
                style={{ width: `${durationSeconds ? Math.min(100, (left / durationSeconds) * 100) : 0}%`, background: pal.bar }}
              />
            </span>
            <span className="text-[13px] leading-[1.45]" style={{ color: pal.note }}>
              {note}
            </span>
          </section>
        </div>
      </main>
    </div>
  )
}
