import type { Metadata } from 'next'

import configPromise from '@payload-config'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getPayload } from 'payload'
import React from 'react'

import { StudentHeader } from '@/components/quiz/StudentHeader'
import { CheckIcon, QuizPage, StarIcon, XIcon, card } from '@/components/quiz/ui'
import { headerStats } from '@/quiz/progress'
import { feedbackFor, getOwnAttempt, getPublishedCertification, publicQuestions } from '@/quiz/server'
import type { ExamResponses, Letter } from '@/quiz/types'
import { getStudent } from '@/utilities/getStudent'

export const dynamic = 'force-dynamic'

type Args = {
  params: Promise<{ slug: string; attemptId: string }>
  searchParams: Promise<{ show?: string }>
}

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'missed', label: 'Missed' },
  { key: 'bookmarked', label: 'Bookmarked' },
] as const

// "Review all answers" from the results screen. Answers are only shown for
// submitted exams that belong to the logged-in student.
export default async function ReviewPage({ params, searchParams }: Args) {
  const { slug, attemptId } = await params
  const { show = 'all' } = await searchParams
  const payload = await getPayload({ config: configPromise })
  const cert = await getPublishedCertification(payload, decodeURIComponent(slug))
  if (!cert) notFound()
  const student = await getStudent()
  if (!student) redirect('/login')
  const attempt = await getOwnAttempt(payload, Number(attemptId), Number(student.id))
  if (!attempt || attempt.mode !== 'exam' || attempt.certification_id !== Number(cert.id)) notFound()
  if (attempt.status !== 'submitted') redirect(`/certifications/${cert.slug}/exam/${attempt.id}`)

  const responses = (attempt.responses || {}) as ExamResponses
  const ids = attempt.question_ids || []
  const [stats, questions] = await Promise.all([headerStats(payload, student), publicQuestions(payload, ids, cert)])
  // Unanswered questions are graded as a wrong pick of "A" only to fetch the
  // explanation; the page shows them as unanswered.
  const feedback = await feedbackFor(
    payload,
    ids.map((id) => ({ questionId: id, chosen: (responses[String(id)]?.c || 'A') as Letter })),
  )

  const rows = questions.map((q, i) => {
    const r = responses[String(q.id)] || {}
    const fb = feedback.get(q.id)
    const correct = Boolean(r.c && fb && r.c === fb.correct)
    return { q, i, r, fb, correct }
  })
  const shown = rows.filter((row) => (show === 'missed' ? !row.correct : show === 'bookmarked' ? row.r.b : true))
  const base = `/certifications/${cert.slug}/results/${attempt.id}`

  return (
    <QuizPage>
      <StudentHeader stats={stats} next={`${base}/review`} />
      <main className="mx-auto flex max-w-[900px] flex-col gap-6 px-4 pb-[72px] pt-8 sm:px-6">
        <nav aria-label="Breadcrumb" className="flex flex-wrap gap-2 text-sm text-[#475467]">
          <Link href={base} className="text-[#475467] no-underline hover:text-[#0B1220]">
            Results
          </Link>
          <span aria-hidden="true">/</span>
          <span className="font-semibold text-[#0B1220]">Review answers</span>
        </nav>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="m-0 text-[32px] font-extrabold tracking-[-0.03em]">{cert.title}: review</h1>
          <div role="group" aria-label="Show" className="flex gap-1.5 rounded-xl bg-[#F2F4F7] p-1">
            {FILTERS.map((f) => (
              <Link
                key={f.key}
                href={`${base}/review${f.key === 'all' ? '' : `?show=${f.key}`}`}
                aria-current={show === f.key ? 'true' : undefined}
                className={`rounded-[9px] px-3.5 py-2 text-sm no-underline ${
                  show === f.key ? 'bg-white font-bold text-[#0B1220] shadow-[0_1px_3px_rgba(16,24,40,0.12)]' : 'font-semibold text-[#475467]'
                }`}
              >
                {f.label}
              </Link>
            ))}
          </div>
        </div>

        {shown.length === 0 && <p className="text-[#475467]">No questions to show here.</p>}

        {shown.map(({ q, i, r, fb, correct }) => (
          <article key={q.id} className={`${card} flex flex-col gap-4 p-6 sm:p-7`}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[13px] font-semibold text-[#475467]">Q{i + 1}</span>
              <span className="rounded-full bg-[#F2F4F7] px-2.5 py-1 text-[13px] font-semibold text-[#344054]">{q.domain}</span>
              <span
                className={`rounded-full px-2.5 py-1 text-[13px] font-bold ${
                  correct ? 'bg-[#ECFDF3] text-[#067647]' : r.c ? 'bg-[#FEF3F2] text-[#B42318]' : 'bg-[#FFFAEB] text-[#93370D]'
                }`}
              >
                {correct ? 'Correct' : r.c ? 'Missed' : 'Not answered'}
              </span>
              {r.b && <span className="rounded-full bg-[#EEF1FF] px-2.5 py-1 text-[13px] font-bold text-[#2B44E8]">Bookmarked</span>}
            </div>
            <h2 className="m-0 whitespace-pre-line text-lg font-semibold leading-[1.45]">{q.text}</h2>
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {q.options.map((o) => {
                const isRight = fb?.correct === o.letter
                const isPick = r.c === o.letter
                return (
                  <li
                    key={o.letter}
                    className={`flex flex-col gap-1 rounded-xl px-4 py-3 ${
                      isRight ? 'border-2 border-[#079455] bg-[#F6FEF9]' : isPick ? 'border-2 border-[#D92D20] bg-[#FFFBFA]' : 'border border-[#E4E7EC]'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <span
                        className={`flex h-7 w-7 flex-none items-center justify-center rounded-lg text-[13px] font-bold ${
                          isRight ? 'bg-[#079455] text-white' : isPick ? 'bg-[#D92D20] text-white' : 'bg-[#F2F4F7] text-[#344054]'
                        }`}
                      >
                        {isRight ? <CheckIcon size={15} strokeWidth={3} /> : isPick ? <XIcon size={15} strokeWidth={3} /> : o.letter}
                      </span>
                      <span className="flex-1">{o.text}</span>
                      {isPick && <span className="text-[13px] font-bold text-[#475467]">Your answer</span>}
                    </span>
                    {fb?.why[o.letter] && <span className="pl-10 text-sm text-[#475467]">{fb.why[o.letter]}</span>}
                  </li>
                )
              })}
            </ul>
            {fb?.explanation && <p className="m-0 whitespace-pre-line leading-[1.65] text-[#344054]">{fb.explanation}</p>}
            {fb?.remember && (
              <div className="flex gap-3 rounded-[14px] bg-[#ECFDF3] px-4 py-3 text-[#074D31]">
                <StarIcon className="mt-0.5 flex-none" />
                <span className="text-[15px]">
                  <strong>Remember:</strong> {fb.remember}
                </span>
              </div>
            )}
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
              {q.studyGuide && (
                <Link href={q.studyGuide.url} className="font-semibold text-[#2B44E8] no-underline">
                  Study guide: {q.studyGuide.title}
                </Link>
              )}
              {fb?.referenceUrl && (
                <a href={fb.referenceUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#2B44E8]">
                  Official docs
                </a>
              )}
            </div>
          </article>
        ))}
      </main>
    </QuizPage>
  )
}

export const metadata: Metadata = {
  title: 'Review answers | CertGenius',
  robots: { index: false },
}
