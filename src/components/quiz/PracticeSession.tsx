'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { GUEST_FREE_QUESTIONS, LETTERS, type Feedback, type Letter, type PracticeResponses, type PublicQuestion } from '@/quiz/types'
import { ReportProblem } from './ReportProblem'
import {
  ArrowRight,
  BookmarkIcon,
  BulbIcon,
  CheckIcon,
  ChevronRight,
  Kbd,
  LogoMark,
  StarIcon,
  XIcon,
  card,
  levelLabel,
  primaryButton,
} from './ui'

type Props = {
  cert: { slug: string; title: string }
  modeLabel: string
  questionIds: number[]
  attemptId: number | null // null = guest
  initialResponses: PracticeResponses
  first: { question: PublicQuestion; feedback: Feedback | null; bookmarked: boolean } | null
  claim: boolean
  finished: boolean
}

const guestKey = (slug: string) => `cg-guest-practice:${slug}`

async function post<T>(url: string, data: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || 'Something went wrong. Please try again.')
  return json as T
}

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export function PracticeSession(props: Props) {
  const { cert, questionIds, attemptId } = props
  const router = useRouter()
  const isGuest = attemptId === null
  const total = questionIds.length

  const [responses, setResponses] = useState<PracticeResponses>(props.initialResponses)
  const [questions, setQuestions] = useState<Map<number, PublicQuestion>>(() =>
    props.first ? new Map([[props.first.question.id, props.first.question]]) : new Map(),
  )
  const [feedback, setFeedback] = useState<Map<number, Feedback>>(() =>
    props.first?.feedback ? new Map([[props.first.question.id, props.first.feedback]]) : new Map(),
  )
  const [bookmarks, setBookmarks] = useState<Map<number, boolean>>(() =>
    props.first ? new Map([[props.first.question.id, props.first.bookmarked]]) : new Map(),
  )
  const firstOpen = questionIds.findIndex((id) => !props.initialResponses[String(id)])
  const [index, setIndex] = useState(firstOpen === -1 ? total : firstOpen)
  const [finished, setFinished] = useState(props.finished || firstOpen === -1)
  const [hintOpen, setHintOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const answering = useRef(false)

  const qid = questionIds[index]
  const question = qid ? questions.get(qid) : undefined
  const fb = qid ? feedback.get(qid) : undefined
  const answeredCount = Object.keys(responses).length
  const correctCount = Object.values(responses).filter((r) => r.ok).length
  const guestDone = isGuest && answeredCount >= Math.min(GUEST_FREE_QUESTIONS, total)

  // Guests: restore answers saved in this browser tab, so a refresh keeps them.
  useEffect(() => {
    if (!isGuest) return
    try {
      const saved = JSON.parse(sessionStorage.getItem(guestKey(cert.slug)) || '{}') as PracticeResponses
      const valid = Object.fromEntries(Object.entries(saved).filter(([id]) => questionIds.includes(Number(id))))
      if (Object.keys(valid).length) {
        setResponses(valid)
        const next = questionIds.findIndex((id) => !valid[String(id)])
        setIndex(next === -1 ? total : next)
      }
    } catch {
      // storage unavailable: start fresh
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // After signing up: turn the guest answers into the start of a real session.
  // The ref guard makes sure this runs once, even when React mounts twice.
  const claimed = useRef(false)
  useEffect(() => {
    if (!props.claim || claimed.current) return
    claimed.current = true
    let saved: PracticeResponses = {}
    try {
      saved = JSON.parse(sessionStorage.getItem(guestKey(cert.slug)) || '{}')
    } catch {
      // nothing to claim
    }
    const claim = Object.entries(saved).map(([id, r]) => ({ questionId: Number(id), choice: r.c }))
    post<{ attemptId: number }>('/api/quiz/practice/start', { certSlug: cert.slug, count: 25, claim })
      .then(({ attemptId: id }) => {
        try {
          sessionStorage.removeItem(guestKey(cert.slug))
        } catch {
          // ignore
        }
        router.replace(`/certifications/${cert.slug}/practice?session=${id}`)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not continue your session.'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const load = useCallback(
    async (id: number) => {
      if (questions.has(id)) return
      const data = await post<{ question: PublicQuestion; feedback: Feedback | null; bookmarked: boolean }>(
        '/api/quiz/practice/question',
        { certSlug: cert.slug, attemptId, questionId: id },
      )
      setQuestions((m) => new Map(m).set(id, data.question))
      if (data.feedback) setFeedback((m) => new Map(m).set(id, data.feedback as Feedback))
      setBookmarks((m) => new Map(m).set(id, data.bookmarked))
    },
    [attemptId, cert.slug, questions],
  )

  // Load the current question, and quietly fetch the next one ahead of time.
  useEffect(() => {
    if (props.claim || finished || !qid) return
    setError('')
    load(qid).catch((e) => setError(e instanceof Error ? e.message : 'Could not load the question.'))
    const nextId = questionIds[index + 1]
    if (nextId && !(isGuest && index + 1 >= GUEST_FREE_QUESTIONS)) load(nextId).catch(() => undefined)
  }, [qid, index, finished, props.claim, load, questionIds, isGuest])

  const answer = useCallback(
    async (choice: Letter) => {
      if (!qid || fb || answering.current || guestDone) return
      answering.current = true
      setBusy(true)
      try {
        const { feedback: result } = await post<{ feedback: Feedback }>('/api/quiz/practice/answer', {
          certSlug: cert.slug,
          attemptId,
          questionId: qid,
          choice,
        })
        setFeedback((m) => new Map(m).set(qid, result))
        setResponses((r) => {
          const next = { ...r, [String(qid)]: { c: result.chosen, ok: result.isCorrect } }
          if (isGuest) {
            try {
              sessionStorage.setItem(guestKey(cert.slug), JSON.stringify(next))
            } catch {
              // ignore
            }
          }
          return next
        })
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not check your answer.')
      } finally {
        answering.current = false
        setBusy(false)
      }
    },
    [qid, fb, guestDone, cert.slug, attemptId, isGuest],
  )

  const finish = useCallback(async () => {
    setFinished(true)
    if (attemptId) await post('/api/quiz/practice/end', { attemptId }).catch(() => undefined)
  }, [attemptId])

  const goNext = useCallback(() => {
    if (!fb) return
    setHintOpen(false)
    setNotice('')
    if (index + 1 >= total) {
      void finish()
      return
    }
    setIndex(index + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [fb, index, total, finish])

  const toggleBookmark = useCallback(async () => {
    if (!qid) return
    if (isGuest) {
      setNotice('Create a free account to bookmark questions.')
      return
    }
    const on = !bookmarks.get(qid)
    setBookmarks((m) => new Map(m).set(qid, on))
    try {
      await post('/api/quiz/bookmark', { questionId: qid, on })
    } catch (e) {
      setBookmarks((m) => new Map(m).set(qid, !on))
      setError(e instanceof Error ? e.message : 'Could not save the bookmark.')
    }
  }, [qid, isGuest, bookmarks])

  // Keyboard: 1-4 choose, B bookmark, Enter next.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('input, textarea, select, [contenteditable="true"]') || e.metaKey || e.ctrlKey || e.altKey) return
      if (['1', '2', '3', '4'].includes(e.key) && !fb) {
        e.preventDefault()
        void answer(LETTERS[Number(e.key) - 1])
      } else if (e.key.toLowerCase() === 'b') {
        e.preventDefault()
        void toggleBookmark()
      } else if (e.key === 'Enter' && fb && !(target instanceof HTMLButtonElement || target instanceof HTMLAnchorElement)) {
        e.preventDefault()
        goNext()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [answer, toggleBookmark, goNext, fb])

  const dots = useMemo(
    () =>
      questionIds.slice(0, 100).map((id, i) => {
        const r = responses[String(id)]
        return { id, i, state: r ? (r.ok ? 'correct' : 'missed') : 'to go' }
      }),
    [questionIds, responses],
  )

  const quizUrl = `/certifications/${cert.slug}/quiz`

  return (
    <div className="min-h-screen bg-[#F6F7F9] font-sans text-[#0B1220]">
      {/* Focus header: no site navigation */}
      <header className="border-b border-[#E4E7EC] bg-white">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-center gap-3.5">
            <LogoMark />
            <div className="flex flex-col">
              <span className="text-[15px] font-bold">{cert.title}</span>
              <span className="text-[13px] text-[#475467]">{props.modeLabel}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-[18px] text-sm">
            <span className="flex items-center gap-2.5">
              <span className="font-semibold">
                {answeredCount} / {total}
              </span>
              <span className="block h-1.5 w-[120px] rounded-full bg-[#E4E7EC]">
                <span
                  className="block h-1.5 rounded-full bg-[#2B44E8]"
                  style={{ width: `${total ? (answeredCount / total) * 100 : 0}%` }}
                />
              </span>
            </span>
            <span className="font-semibold text-[#067647]">{correctCount} correct</span>
            <span className="font-semibold text-[#B42318]">{answeredCount - correctCount} missed</span>
            {finished ? (
              <Link href={quizUrl} className="font-semibold text-[#475467] no-underline hover:text-[#0B1220]">
                Back to modes
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => (isGuest ? router.push(quizUrl) : void finish())}
                className="font-semibold text-[#475467] hover:text-[#0B1220]"
              >
                End session
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-[1240px] flex-wrap items-start gap-6 px-4 pb-16 pt-7 sm:px-6">
        <div className="flex min-w-0 flex-[999_1_620px] flex-col gap-4">
          {error && (
            <p role="alert" className="m-0 rounded-xl bg-[#FEF3F2] px-4 py-3 text-sm font-semibold text-[#B42318]">
              {error}
            </p>
          )}

          {props.claim ? (
            <section className={`${card} p-8 text-[15px] text-[#475467]`}>Saving your progress...</section>
          ) : finished ? (
            <Finished
              correct={correctCount}
              answered={answeredCount}
              quizUrl={quizUrl}
              isGuest={isGuest}
            />
          ) : guestDone && !fb ? (
            <GuestLimit slug={cert.slug} />
          ) : !question ? (
            <section className={`${card} p-8 text-[15px] text-[#475467]`}>Loading question...</section>
          ) : (
            <>
              <section className={`${card} flex flex-col gap-[22px] p-5 sm:p-8`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-[#F2F4F7] px-2.5 py-1.5 text-[13px] font-semibold text-[#344054]">
                      {question.domain}
                    </span>
                    {question.level && levelLabel[question.level] && (
                      <span className={`rounded-full px-2.5 py-1.5 text-[13px] font-semibold ${levelLabel[question.level].className}`}>
                        {levelLabel[question.level].label}
                      </span>
                    )}
                  </div>
                  <BookmarkButton on={Boolean(bookmarks.get(question.id))} onClick={toggleBookmark} />
                </div>

                <h1 className="m-0 whitespace-pre-line text-[21px] font-semibold leading-[1.4] tracking-[-0.02em] sm:text-[26px]">
                  {question.text}
                </h1>

                <div className="flex flex-col gap-2.5">
                  {question.options.map((o, i) =>
                    fb ? (
                      <AnsweredOption key={o.letter} letter={o.letter} text={o.text} fb={fb} />
                    ) : (
                      <button
                        key={o.letter}
                        type="button"
                        disabled={busy}
                        onClick={() => answer(o.letter)}
                        aria-keyshortcuts={String(i + 1)}
                        className="flex min-h-[62px] items-center gap-3.5 rounded-[14px] border border-[#D0D5DD] bg-white px-4 py-3 text-left text-[#0B1220] transition-colors hover:border-[#2B44E8] hover:bg-[#EEF1FF] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2B44E8] disabled:opacity-70"
                      >
                        <span className="flex h-8 w-8 flex-none items-center justify-center rounded-[9px] bg-[#F2F4F7] text-sm font-bold text-[#344054]">
                          {o.letter}
                        </span>
                        <span className="text-base leading-normal">{o.text}</span>
                      </button>
                    ),
                  )}
                </div>
                {notice && <p className="m-0 text-sm font-semibold text-[#2B44E8]">{notice}</p>}
                <ReportProblem questionId={question.id} isGuest={isGuest} loginNext={`/certifications/${cert.slug}/quiz`} />
              </section>

              {fb && <Explanation fb={fb} />}

              <div className="flex flex-wrap items-center justify-between gap-3">
                {fb ? (
                  <span className="text-[13px] text-[#475467]">
                    Press <Kbd>Enter</Kbd> for the next question
                  </span>
                ) : (
                  <span aria-label="Keyboard shortcuts" className="flex flex-wrap gap-[18px] text-[13px] text-[#475467]">
                    <span>
                      <Kbd>1</Kbd>–<Kbd>4</Kbd> choose answer
                    </span>
                    <span>
                      <Kbd>B</Kbd> bookmark
                    </span>
                    <span>
                      <Kbd>Enter</Kbd> next
                    </span>
                  </span>
                )}
                {fb && (
                  <button type="button" onClick={goNext} className={`${primaryButton} h-[50px] px-[26px] text-[15px]`}>
                    {index + 1 >= total ? 'Finish session' : isGuest && index + 1 >= GUEST_FREE_QUESTIONS ? 'Continue' : 'Next question'}
                    <ChevronRight />
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        <aside className="flex flex-[1_1_320px] flex-col gap-4">
          {question?.hint && !finished && !guestDone && (
            <section aria-label="Hint" className={`${card} flex flex-col gap-3 p-5 shadow-none`}>
              <button
                type="button"
                aria-expanded={hintOpen}
                onClick={() => setHintOpen(!hintOpen)}
                className="flex h-11 items-center gap-2 rounded-xl border border-[#FEDF89] bg-[#FFFAEB] px-3 text-sm font-bold text-[#93370D] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2B44E8]"
              >
                <BulbIcon />
                {hintOpen ? 'Hide hint' : 'Show hint'}
              </button>
              {hintOpen && <p className="m-0 text-[15px] leading-[1.55] text-[#344054]">{question.hint}</p>}
            </section>
          )}

          {question?.studyGuide && !finished && (
            <Link
              href={question.studyGuide.url}
              className="flex flex-col gap-3.5 rounded-[20px] bg-[#0B1220] p-6 text-white no-underline hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2B44E8]"
            >
              <span className="text-xs font-bold tracking-[0.06em] text-[#7CF2B0]">STUDY GUIDE</span>
              <span className="text-xl font-bold leading-[1.3] tracking-[-0.02em]">{question.studyGuide.title}</span>
              <span className="text-sm leading-normal text-[#C2C9D6]">
                Covers <strong className="text-white">{question.domain}</strong>. This guide answers{' '}
                {question.studyGuide.domainQuestionCount} question{question.studyGuide.domainQuestionCount === 1 ? '' : 's'} in
                this domain.
              </span>
              <span className="flex h-11 items-center justify-center gap-2 rounded-xl bg-white text-sm font-bold text-[#0B1220]">
                Read the guide
                <ArrowRight size={16} />
              </span>
            </Link>
          )}

          <section aria-label="Session progress" className={`${card} flex flex-col gap-3 p-5 shadow-none`}>
            <h2 className="m-0 text-[15px] font-bold">This session</h2>
            <div className="grid grid-cols-10 gap-1">
              {dots.map((d) => (
                <span
                  key={d.id}
                  aria-label={`Question ${d.i + 1} ${d.state}`}
                  className="block h-2.5 rounded-[3px]"
                  style={{ background: d.state === 'correct' ? '#17B26A' : d.state === 'missed' ? '#F04438' : '#E4E7EC' }}
                />
              ))}
            </div>
            {total > 100 && <span className="text-xs text-[#475467]">Showing the first 100 of {total}</span>}
            <span className="text-[13px] text-[#475467]">Green correct, red missed, grey to go</span>
          </section>
        </aside>
      </main>
    </div>
  )
}

function BookmarkButton({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      aria-keyshortcuts="B"
      className={`flex h-10 items-center gap-[7px] rounded-[10px] px-3 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2B44E8] ${
        on ? 'border-[1.5px] border-[#2B44E8] bg-[#EEF1FF] text-[#2B44E8]' : 'border border-[#D0D5DD] bg-white text-[#344054]'
      }`}
    >
      <BookmarkIcon size={17} fill={on ? 'currentColor' : 'none'} />
      {on ? 'Saved' : 'Bookmark'}
    </button>
  )
}
export { BookmarkButton }

function AnsweredOption({ letter, text, fb }: { letter: Letter; text: string; fb: Feedback }) {
  const right = fb.correct === letter
  const wrongPick = !right && fb.chosen === letter
  const pct = fb.stats?.[letter]
  const why = fb.why[letter]
  return (
    <div
      className={`flex flex-col gap-2.5 rounded-[14px] px-4 py-3.5 ${
        right ? 'border-2 border-[#079455] bg-[#F6FEF9]' : wrongPick ? 'border-2 border-[#D92D20] bg-[#FFFBFA]' : 'border border-[#E4E7EC] bg-white'
      }`}
    >
      <div className="flex items-center gap-3.5">
        <span
          className={`flex h-8 w-8 flex-none items-center justify-center rounded-[9px] text-sm font-bold ${
            right ? 'bg-[#079455] text-white' : wrongPick ? 'bg-[#D92D20] text-white' : 'bg-[#F2F4F7] text-[#344054]'
          }`}
        >
          {right ? <CheckIcon size={17} strokeWidth={3} /> : wrongPick ? <XIcon size={17} strokeWidth={3} /> : letter}
        </span>
        <span className="flex-1 text-base leading-normal">{text}</span>
        {(right || wrongPick) && (
          <span className={`whitespace-nowrap text-[13px] font-bold ${right ? 'text-[#067647]' : 'text-[#B42318]'}`}>
            {right ? (fb.chosen === letter ? 'Your answer' : 'Correct answer') : 'Your answer'}
          </span>
        )}
      </div>
      {why && <p className="m-0 pl-[46px] text-sm leading-normal text-[#475467]">{why}</p>}
      {pct !== undefined && (
        <div className="flex items-center gap-2.5 pl-[46px]">
          <span className="block h-1 flex-1 rounded-full bg-[#EEF0F3]">
            <span
              className="block h-1 rounded-full"
              style={{ width: `${pct}%`, background: right ? '#079455' : wrongPick ? '#D92D20' : '#98A2B3' }}
            />
          </span>
          <span className="w-[92px] text-right text-xs font-semibold text-[#475467]">{pct}% chose this</span>
        </div>
      )}
    </div>
  )
}

function Explanation({ fb }: { fb: Feedback }) {
  return (
    <section aria-label="Explanation" className={`${card} flex flex-col gap-4 px-5 py-7 shadow-none sm:px-8`}>
      <div className="flex flex-wrap items-center gap-2.5">
        <span
          className={`rounded-full px-2.5 py-[5px] text-[13px] font-bold ${fb.isCorrect ? 'bg-[#ECFDF3] text-[#067647]' : 'bg-[#FEF3F2] text-[#B42318]'}`}
        >
          {fb.isCorrect ? 'Correct' : 'Not quite'}
        </span>
        <h2 className="m-0 text-[19px] font-bold">Why the answer is {fb.correct}</h2>
      </div>
      {fb.explanation && <p className="m-0 whitespace-pre-line text-base leading-[1.7] text-[#344054]">{fb.explanation}</p>}
      {fb.remember && (
        <div className="flex gap-3 rounded-[14px] bg-[#ECFDF3] px-4 py-3.5 text-[#074D31]">
          <StarIcon className="mt-0.5 flex-none" />
          <span className="text-[15px] leading-[1.55]">
            <strong>Remember:</strong> {fb.remember}
          </span>
        </div>
      )}
      {fb.referenceUrl && (
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <a href={fb.referenceUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#2B44E8] hover:text-[#1A2DB0]">
            Official docs: {hostOf(fb.referenceUrl)}
          </a>
        </div>
      )}
    </section>
  )
}

function GuestLimit({ slug }: { slug: string }) {
  const next = encodeURIComponent(`/certifications/${slug}/practice?claim=1`)
  return (
    <section className="flex flex-col gap-4 rounded-[20px] bg-[#0B1220] p-8 text-white">
      <span className="text-xs font-bold tracking-[0.06em] text-[#7CF2B0]">FREE QUESTIONS USED</span>
      <h1 className="m-0 text-[28px] font-extrabold leading-[1.15] tracking-[-0.03em]">Keep going with a free account</h1>
      <p className="m-0 max-w-[560px] text-base leading-[1.6] text-[#C2C9D6]">
        You have answered the {GUEST_FREE_QUESTIONS} free questions. Sign up to keep these answers, continue practising, take
        exam simulations and track your progress. It is free.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link
          href={`/signup?next=${next}`}
          className="flex h-[50px] items-center rounded-xl bg-[#7CF2B0] px-6 text-[15px] font-bold text-[#053321] no-underline hover:text-[#053321]"
        >
          Create free account
        </Link>
        <Link
          href={`/login?next=${next}`}
          className="flex h-[50px] items-center rounded-xl border border-[#344054] px-6 text-[15px] font-bold text-white no-underline hover:text-white"
        >
          Log in
        </Link>
      </div>
    </section>
  )
}

function Finished({
  correct,
  answered,
  quizUrl,
  isGuest,
}: {
  correct: number
  answered: number
  quizUrl: string
  isGuest: boolean
}) {
  const pct = answered ? Math.round((correct / answered) * 100) : 0
  return (
    <section className={`${card} flex flex-col gap-4 p-8`}>
      <span className="text-xs font-bold tracking-[0.06em] text-[#475467]">SESSION COMPLETE</span>
      <h1 className="m-0 text-[30px] font-extrabold tracking-[-0.03em]">
        {correct} of {answered} correct ({pct}%)
      </h1>
      <p className="m-0 text-base leading-[1.6] text-[#475467]">
        {isGuest
          ? 'Create a free account to save your progress and keep practising.'
          : 'Your answers count towards your domain mastery and daily goal.'}
      </p>
      <div className="flex flex-wrap gap-3">
        <Link href={quizUrl} className={`${primaryButton} h-[50px] text-[15px]`}>
          Choose another session
        </Link>
      </div>
    </section>
  )
}
