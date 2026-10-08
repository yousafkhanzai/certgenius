import type { Metadata } from 'next'

import configPromise from '@payload-config'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import React from 'react'

import { RemoveBookmarkButton } from '@/components/quiz/RemoveBookmarkButton'
import { StudentHeader } from '@/components/quiz/StudentHeader'
import { ArrowRight, CheckIcon, QuizPage, StarIcon, card } from '@/components/quiz/ui'
import { headerStats, questionsInOpenExams } from '@/quiz/progress'
import { feedbackFor, pool, publicQuestions } from '@/quiz/server'
import type { PublicQuestion } from '@/quiz/types'
import { getStudent } from '@/utilities/getStudent'

export const dynamic = 'force-dynamic'

type Args = { searchParams: Promise<{ cert?: string; page?: string }> }

const PAGE_SIZE = 20

// Bookmarked questions with the correct answer, explanation and study guide.
export default async function BookmarksPage({ searchParams }: Args) {
  const student = await getStudent()
  if (!student) redirect('/login?next=/bookmarks')
  const studentId = Number(student.id)
  const { cert: certFilter, page: pageParam } = await searchParams
  const page = Math.max(1, Number(pageParam) || 1)
  const payload = await getPayload({ config: configPromise })

  // Certifications this student has bookmarks in (published ones only), for the filter.
  const { rows: certRows } = await pool(payload).query<{ id: number; slug: string; title: string; n: number }>(
    `select c.id, c.slug, c.title, count(*)::int as n from bookmarks b
     join questions q on q.id = b.question_id
     join certifications c on c.id = q.certification_id
     where b.student_id = $1 and c._status = 'published'
     group by c.id, c.slug, c.title order by c.title`,
    [studentId],
  )
  const activeCert = certRows.find((c) => c.slug === certFilter)

  const params: unknown[] = [studentId, PAGE_SIZE, (page - 1) * PAGE_SIZE]
  let where = `b.student_id = $1 and c._status = 'published'`
  if (activeCert) {
    params.push(activeCert.id)
    where += ` and c.id = $4`
  }
  const { rows } = await pool(payload).query<{ question_id: number; certification_id: number; total: number }>(
    `select b.question_id, q.certification_id, count(*) over ()::int as total
     from bookmarks b join questions q on q.id = b.question_id join certifications c on c.id = q.certification_id
     where ${where} order by b.created_at desc limit $2 offset $3`,
    params,
  )
  const total = rows[0]?.total ?? 0
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  // Question data per certification (study guides come from the certification).
  const certIds = Array.from(new Set(rows.map((r) => r.certification_id)))
  const certs = certIds.length
    ? (
        await payload.find({
          collection: 'certifications',
          where: { id: { in: certIds } },
          depth: 1,
          limit: certIds.length,
          overrideAccess: false,
        })
      ).docs
    : []
  const questions = new Map<number, PublicQuestion>()
  for (const cert of certs) {
    const ids = rows.filter((r) => r.certification_id === Number(cert.id)).map((r) => r.question_id)
    for (const q of await publicQuestions(payload, ids, cert)) questions.set(q.id, q)
  }
  // Answers stay hidden for questions in an exam the student hasn't finished.
  const hidden = await questionsInOpenExams(payload, studentId)
  const feedback = await feedbackFor(
    payload,
    rows.filter((r) => !hidden.has(r.question_id)).map((r) => ({ questionId: r.question_id, chosen: 'A' as const })),
  )
  const certTitle = new Map(certRows.map((c) => [c.id, c]))
  const stats = await headerStats(payload, student)
  const qs = (p: number, slug?: string) => {
    const s = new URLSearchParams()
    if (slug) s.set('cert', slug)
    if (p > 1) s.set('page', String(p))
    const str = s.toString()
    return `/bookmarks${str ? `?${str}` : ''}`
  }

  return (
    <QuizPage>
      <StudentHeader stats={stats} active="bookmarks" next="/bookmarks" />
      <main className="mx-auto flex max-w-[960px] flex-col gap-6 px-4 pb-[72px] pt-8 sm:px-6">
        <div className="flex flex-col gap-2">
          <h1 className="m-0 text-[32px] font-extrabold tracking-[-0.03em]">Bookmarks</h1>
          <p className="m-0 text-[#475467]">
            Questions you saved while practising or during exams, with the correct answer and a guide to study.
          </p>
        </div>

        {certRows.length > 0 && (
          <nav aria-label="Filter by certification" className="flex flex-wrap gap-2">
            <Link
              href={qs(1)}
              aria-current={!activeCert ? 'true' : undefined}
              className={`rounded-full px-3.5 py-2 text-sm font-semibold no-underline ${
                !activeCert ? 'bg-[#0B1220] text-white' : 'border border-[#D0D5DD] bg-white text-[#344054]'
              }`}
            >
              All ({certRows.reduce((s, c) => s + c.n, 0)})
            </Link>
            {certRows.map((c) => (
              <Link
                key={c.id}
                href={qs(1, c.slug)}
                aria-current={activeCert?.id === c.id ? 'true' : undefined}
                className={`rounded-full px-3.5 py-2 text-sm font-semibold no-underline ${
                  activeCert?.id === c.id ? 'bg-[#0B1220] text-white' : 'border border-[#D0D5DD] bg-white text-[#344054]'
                }`}
              >
                {c.title} ({c.n})
              </Link>
            ))}
          </nav>
        )}

        {rows.length === 0 && (
          <div className={`${card} flex flex-col items-start gap-3 p-6 shadow-none`}>
            <p className="m-0 text-[#475467]">
              No bookmarks yet. Press the <strong>Bookmark</strong> button (or the <strong>B</strong> key) on any question to save it here.
            </p>
            <Link href="/certifications" className="font-semibold text-[#2B44E8] no-underline">
              Start practising
            </Link>
          </div>
        )}

        {rows.map((r) => {
          const q = questions.get(r.question_id)
          if (!q) return null
          const fb = feedback.get(r.question_id)
          const c = certTitle.get(r.certification_id)
          return (
            <article key={q.id} className={`${card} flex flex-col gap-4 p-6 sm:p-7`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-1.5">
                  {c && <span className="rounded-full bg-[#EEF1FF] px-2.5 py-1 text-[13px] font-semibold text-[#2B44E8]">{c.title}</span>}
                  <span className="rounded-full bg-[#F2F4F7] px-2.5 py-1 text-[13px] font-semibold text-[#344054]">{q.domain}</span>
                </div>
                <RemoveBookmarkButton questionId={q.id} />
              </div>
              <h2 className="m-0 whitespace-pre-line text-lg font-semibold leading-[1.45]">{q.text}</h2>

              {fb ? (
                <>
                  <ul className="m-0 flex list-none flex-col gap-2 p-0">
                    {q.options.map((o) => {
                      const right = fb.correct === o.letter
                      return (
                        <li
                          key={o.letter}
                          className={`flex items-center gap-3 rounded-xl px-4 py-3 ${right ? 'border-2 border-[#079455] bg-[#F6FEF9]' : 'border border-[#E4E7EC]'}`}
                        >
                          <span
                            className={`flex h-7 w-7 flex-none items-center justify-center rounded-lg text-[13px] font-bold ${
                              right ? 'bg-[#079455] text-white' : 'bg-[#F2F4F7] text-[#344054]'
                            }`}
                          >
                            {right ? <CheckIcon size={15} strokeWidth={3} /> : o.letter}
                          </span>
                          <span className="flex-1">{o.text}</span>
                          {right && <span className="text-[13px] font-bold text-[#067647]">Correct answer</span>}
                        </li>
                      )
                    })}
                  </ul>
                  {fb.explanation && <p className="m-0 whitespace-pre-line leading-[1.65] text-[#344054]">{fb.explanation}</p>}
                  {fb.remember && (
                    <div className="flex gap-3 rounded-[14px] bg-[#ECFDF3] px-4 py-3 text-[#074D31]">
                      <StarIcon className="mt-0.5 flex-none" />
                      <span className="text-[15px]">
                        <strong>Remember:</strong> {fb.remember}
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <p className="m-0 rounded-xl bg-[#FFFAEB] px-4 py-3 text-sm font-semibold text-[#93370D]">
                  This question is in an exam you haven&apos;t finished yet. The answer appears here once you submit it.
                </p>
              )}

              {q.studyGuide && (
                <Link
                  href={q.studyGuide.url}
                  className="flex w-fit items-center gap-2 rounded-xl bg-[#0B1220] px-4 py-2.5 text-sm font-bold text-white no-underline hover:text-white"
                >
                  Study this topic: {q.studyGuide.title}
                  <ArrowRight size={15} />
                </Link>
              )}
            </article>
          )
        })}

        {pages > 1 && (
          <nav aria-label="Bookmark pages" className="flex items-center gap-3 text-sm">
            {page > 1 && (
              <Link href={qs(page - 1, activeCert?.slug)} className="font-semibold text-[#2B44E8] no-underline">
                Previous
              </Link>
            )}
            <span className="text-[#475467]">
              Page {page} of {pages}
            </span>
            {page < pages && (
              <Link href={qs(page + 1, activeCert?.slug)} className="font-semibold text-[#2B44E8] no-underline">
                Next
              </Link>
            )}
          </nav>
        )}
      </main>
    </QuizPage>
  )
}

export const metadata: Metadata = {
  title: 'Bookmarks | CertGenius',
  robots: { index: false },
}
