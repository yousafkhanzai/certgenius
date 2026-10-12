import type { Metadata } from 'next'

import configPromise from '@payload-config'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import React from 'react'

import { LogoutButton } from '@/components/StudentAuth/LogoutButton'
import { DailyGoalForm } from '@/components/quiz/DailyGoalForm'
import { StudentHeader } from '@/components/quiz/StudentHeader'
import { FlameIcon, QuizPage, card, formatClock, primaryButton, secondaryButton } from '@/components/quiz/ui'
import {
  activeCertificationIds,
  activityHistory,
  examHistory,
  headerStats,
  masteryByDomain,
  practiceTotals,
  progressByDomain,
  readinessFrom,
} from '@/quiz/progress'
import { domainQuestionCounts } from '@/quiz/server'
import { getStudent } from '@/utilities/getStudent'

export const dynamic = 'force-dynamic'

type Args = { searchParams: Promise<{ page?: string }> }

const PAGE_SIZE = 10

// Student profile: readiness, progress and mastery per domain, streak, daily
// goal and a history of practice sessions and exam simulations.
export default async function AccountPage({ searchParams }: Args) {
  const student = await getStudent()
  if (!student) redirect('/login?next=/account')
  const studentId = Number(student.id)
  const page = Math.max(1, Number((await searchParams).page) || 1)
  const payload = await getPayload({ config: configPromise })

  const [stats, certIds, history, totals] = await Promise.all([
    headerStats(payload, student),
    activeCertificationIds(payload, studentId),
    activityHistory(payload, studentId, PAGE_SIZE, (page - 1) * PAGE_SIZE),
    practiceTotals(payload, studentId),
  ])

  // Published certifications only.
  const certs = certIds.length
    ? (
        await payload.find({
          collection: 'certifications',
          where: { id: { in: certIds } },
          depth: 0,
          limit: certIds.length,
          overrideAccess: false,
        })
      ).docs.sort((a, b) => certIds.indexOf(Number(a.id)) - certIds.indexOf(Number(b.id)))
    : []
  const certById = new Map(certs.map((c) => [Number(c.id), c]))

  const certCards = await Promise.all(
    certs.map(async (cert) => {
      const certId = Number(cert.id)
      const [exams, mastery, progress, counts] = await Promise.all([
        examHistory(payload, studentId, certId, 3),
        masteryByDomain(payload, studentId, certId),
        progressByDomain(payload, studentId, certId),
        domainQuestionCounts(payload, certId),
      ])
      // The certification's own domains, plus any other domain the student has answered in.
      const names = Array.from(new Set([...(cert.domains || []).map((d) => d.name), ...progress.keys()]))
      const domains = names
        .map((name) => ({
          name,
          total: counts.get(name) || 0,
          practised: progress.get(name)?.practised || 0,
          correct: progress.get(name)?.correct || 0,
          mastered: mastery.get(name) || 0,
        }))
        .filter((d) => d.total > 0)
      const practised = domains.reduce((s, d) => s + d.practised, 0)
      const correct = domains.reduce((s, d) => s + d.correct, 0)
      return { cert, readiness: readinessFrom(exams), examCount: exams.length, domains, practised, correct }
    }),
  )

  const accuracy = totals.answered ? Math.round((totals.correct / totals.answered) * 100) : null
  const goalPct = Math.min(100, Math.round((stats.answeredToday / stats.dailyGoal) * 100))
  const memberSince = new Date(student.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const pages = Math.max(1, Math.ceil(history.total / PAGE_SIZE))
  const ring = 2 * Math.PI * 30
  const days = (n: number) => `${n} day${n === 1 ? '' : 's'}`

  return (
    <QuizPage>
      <StudentHeader stats={stats} next="/account" />
      <main className="mx-auto flex max-w-[1240px] flex-col gap-6 px-4 pb-[72px] pt-8 sm:px-6">
        <section className="flex flex-wrap items-center justify-between gap-6 rounded-[24px] bg-[#0B1220] p-6 text-white sm:p-9">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-bold tracking-[0.06em] text-[#98A2B3]">YOUR PROFILE</span>
            <h1 className="m-0 text-[30px] font-extrabold tracking-[-0.03em] sm:text-[36px]">
              {student.name ? `Hi, ${student.name}` : 'Your progress'}
            </h1>
            <span className="text-sm text-[#C2C9D6]">
              {student.email} · Member since {memberSince}
            </span>
          </div>
          <div className="grid w-full grid-cols-2 gap-3 sm:w-auto sm:grid-cols-4">
            {[
              { label: 'Current streak', value: days(stats.streak) },
              { label: 'Longest streak', value: days(Number(student.longestStreak ?? 0)) },
              { label: 'Questions answered', value: String(totals.answered) },
              { label: 'Correct answers', value: accuracy === null ? '--' : `${accuracy}%` },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl bg-[#121B2E] px-4 py-3">
                <div className="text-xs text-[#98A2B3]">{s.label}</div>
                <div className="text-xl font-bold">{s.value}</div>
              </div>
            ))}
          </div>
        </section>

        <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr))]">
          <section aria-label="Daily goal" className={`${card} flex flex-col gap-4 p-6 shadow-none`}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="m-0 text-lg font-bold">Daily goal</h2>
              <span className="flex items-center gap-1.5 rounded-full bg-[#FFFAEB] px-3 py-1.5 text-sm font-semibold text-[#93370D]">
                <FlameIcon size={15} strokeWidth={2.2} />
                {stats.streak}-day streak
              </span>
            </div>
            <div className="flex items-center gap-4">
              <svg width="76" height="76" viewBox="0 0 76 76" aria-hidden="true" className="flex-none">
                <circle cx="38" cy="38" r="30" fill="none" stroke="#EEF0F3" strokeWidth="8" />
                <circle
                  cx="38"
                  cy="38"
                  r="30"
                  fill="none"
                  stroke={goalPct >= 100 ? '#079455' : '#2B44E8'}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${(goalPct / 100) * ring} ${ring}`}
                  transform="rotate(-90 38 38)"
                />
              </svg>
              <div className="flex flex-col">
                <span className="text-2xl font-extrabold">
                  {stats.answeredToday} / {stats.dailyGoal}
                </span>
                <span className="text-sm text-[#475467]">
                  {goalPct >= 100 ? 'Goal reached today. Nice work!' : 'questions answered today'}
                </span>
              </div>
            </div>
            <DailyGoalForm studentId={student.id} current={stats.dailyGoal} />
          </section>

          <section aria-label="Shortcuts" className={`${card} flex flex-col gap-3 p-6 shadow-none`}>
            <h2 className="m-0 text-lg font-bold">Shortcuts</h2>
            {[
              ['/bookmarks', 'Bookmarked questions'],
              ['/certifications', 'Browse certifications'],
              ['/posts', 'Study guides'],
            ].map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className="rounded-xl border border-[#E4E7EC] px-4 py-3 font-semibold text-[#0B1220] no-underline hover:border-[#2B44E8] hover:text-[#0B1220]"
              >
                {label}
              </Link>
            ))}
          </section>
        </div>

        <section aria-label="Your certifications" className="flex flex-col gap-4">
          <h2 className="m-0 text-xl font-bold tracking-[-0.02em]">Your certifications</h2>
          {certCards.length === 0 && (
            <div className={`${card} flex flex-col items-start gap-3 p-6 shadow-none`}>
              <p className="m-0 text-[#475467]">
                You haven&apos;t started a certification yet. Pick one and answer a few questions; your progress shows up here.
              </p>
              <Link href="/certifications" className={`${primaryButton} h-11 text-sm`}>
                Pick a certification
              </Link>
            </div>
          )}
          {certCards.map(({ cert, readiness, examCount, domains, practised, correct }) => {
            const pass = cert.passingScore || 0
            const quizUrl = `/certifications/${cert.slug}/quiz`
            const practiceAccuracy = practised ? Math.round((correct / practised) * 100) : null
            return (
              <article key={cert.id} className={`${card} flex flex-col gap-6 p-6 shadow-none`}>
                <div className="flex flex-wrap items-center justify-between gap-5">
                  <div className="flex flex-col gap-1.5">
                    {cert.examCode && (
                      <span className="w-fit rounded-md bg-[#0B1220] px-2 py-1 font-mono text-xs font-semibold text-white">{cert.examCode}</span>
                    )}
                    <h3 className="m-0 text-xl font-bold leading-snug">{cert.title}</h3>
                    <span className="text-sm text-[#475467]">
                      {practised} question{practised === 1 ? '' : 's'} practised
                      {practiceAccuracy !== null ? ` · ${practiceAccuracy}% correct` : ''}
                    </span>
                  </div>
                  <Link href={quizUrl} className={`${secondaryButton} h-11 text-sm`}>
                    Continue practising
                  </Link>
                </div>

                <div className="flex flex-wrap items-center gap-5 rounded-2xl bg-[#F6F7F9] p-5">
                  <div className="relative h-24 w-24 flex-none">
                    <svg width="96" height="96" viewBox="0 0 96 96" aria-hidden="true">
                      <circle cx="48" cy="48" r="40" fill="none" stroke="#E4E7EC" strokeWidth="9" />
                      {readiness.score !== null && (
                        <circle
                          cx="48"
                          cy="48"
                          r="40"
                          fill="none"
                          stroke={readiness.score >= pass ? '#079455' : '#DC6803'}
                          strokeWidth="9"
                          strokeLinecap="round"
                          strokeDasharray={`${(readiness.score / 100) * 2 * Math.PI * 40} ${2 * Math.PI * 40}`}
                          transform="rotate(-90 48 48)"
                        />
                      )}
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-xl font-extrabold">
                      {readiness.score === null ? '?' : `${readiness.score}%`}
                    </span>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="text-xs font-bold tracking-[0.06em] text-[#475467]">EXAM READINESS</span>
                    {readiness.score === null ? (
                      <>
                        <span className="text-lg font-bold">Not measured yet</span>
                        <span className="text-sm text-[#475467]">
                          Readiness is the average of your last 3 exam simulations. Practice sessions don&apos;t count towards it, so take
                          an exam simulation to get your first score.
                        </span>
                        <Link href={quizUrl} className="mt-1 w-fit text-sm font-semibold text-[#2B44E8] no-underline">
                          Take an exam simulation
                        </Link>
                      </>
                    ) : (
                      <>
                        <span className="text-lg font-bold">{readiness.score >= pass ? 'On track to pass' : 'Not ready yet'}</span>
                        <span className="text-sm text-[#475467]">
                          Average of your last {examCount} exam simulation{examCount === 1 ? '' : 's'}
                          {pass ? `. You need ${pass}% to pass.` : '.'}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h4 className="m-0 text-[15px] font-bold">Progress by domain</h4>
                    <span className="text-[13px] text-[#475467]">
                      Blue: answered correctly · Mastered: correct twice in a row
                    </span>
                  </div>
                  {domains.map((d) => {
                    const correctPct = Math.round((d.correct / d.total) * 100)
                    const practisedPct = Math.round((d.practised / d.total) * 100)
                    return (
                      <div key={d.name} className="flex flex-col gap-1.5">
                        <div className="flex flex-wrap justify-between gap-x-3 text-sm">
                          <span className="font-semibold">{d.name}</span>
                          <span className="text-[#475467]">
                            {d.practised === 0 ? (
                              `Not started · ${d.total} questions`
                            ) : (
                              <>
                                <strong className="text-[#0B1220]">{d.correct}</strong> correct of {d.practised} practised · {d.total} in
                                total · <strong className="text-[#0B1220]">{d.mastered}</strong> mastered
                              </>
                            )}
                          </span>
                        </div>
                        {/* Light bar: practised. Solid bar: answered correctly. */}
                        <span className="relative block h-2 rounded-full bg-[#EEF0F3]">
                          <span className="absolute left-0 top-0 block h-2 rounded-full bg-[#C7D0FA]" style={{ width: `${practisedPct}%` }} />
                          <span className="absolute left-0 top-0 block h-2 rounded-full bg-[#2B44E8]" style={{ width: `${correctPct}%` }} />
                        </span>
                      </div>
                    )
                  })}
                </div>
              </article>
            )
          })}
        </section>

        <section aria-label="History" className={`${card} flex flex-col gap-4 p-6 shadow-none`}>
          <h2 className="m-0 text-xl font-bold tracking-[-0.02em]">Your history</h2>
          {history.rows.length === 0 ? (
            <p className="m-0 text-[#475467]">Nothing yet. Your practice sessions and exam simulations will appear here.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-[#E4E7EC] text-[#475467]">
                    <th className="py-2 pr-4 font-semibold">Date</th>
                    <th className="py-2 pr-4 font-semibold">Certification</th>
                    <th className="py-2 pr-4 font-semibold">Type</th>
                    <th className="py-2 pr-4 font-semibold">Score</th>
                    <th className="py-2 pr-4 font-semibold">Time</th>
                    <th className="py-2 font-semibold">
                      <span className="sr-only">Open</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {history.rows.map((h) => {
                    const cert = certById.get(h.certificationId)
                    const inProgress = h.status === 'in-progress'
                    const link = !cert
                      ? null
                      : h.mode === 'exam'
                        ? inProgress
                          ? { href: `/certifications/${cert.slug}/exam/${h.id}`, label: 'Resume' }
                          : { href: `/certifications/${cert.slug}/results/${h.id}`, label: 'View results' }
                        : inProgress
                          ? { href: `/certifications/${cert.slug}/practice?session=${h.id}`, label: 'Continue' }
                          : { href: `/certifications/${cert.slug}/quiz`, label: 'Practise again' }
                    return (
                      <tr key={h.id} className="border-b border-[#F2F4F7] align-top">
                        <td className="whitespace-nowrap py-3 pr-4">
                          {new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="py-3 pr-4">{cert?.title ?? 'Certification no longer available'}</td>
                        <td className="py-3 pr-4">
                          <span className="font-semibold">{h.mode === 'exam' ? 'Exam simulation' : 'Practice'}</span>
                          {h.mode === 'practice' && <span className="block text-[13px] text-[#475467]">{h.label || 'All domains'}</span>}
                        </td>
                        <td className="py-3 pr-4">
                          {inProgress && h.mode === 'exam' ? (
                            <span className="rounded-full bg-[#FFFAEB] px-2.5 py-1 text-xs font-bold text-[#93370D]">In progress</span>
                          ) : (
                            <>
                              <span className="font-bold">{h.score === null ? '--' : `${h.score}%`}</span>{' '}
                              <span className="text-[13px] text-[#475467]">
                                ({h.correct} of {h.mode === 'exam' ? h.total : h.answered})
                              </span>
                              {h.mode === 'exam' && h.passed !== null && (
                                <span
                                  className={`ml-2 rounded-full px-2.5 py-1 text-xs font-bold ${h.passed ? 'bg-[#ECFDF3] text-[#067647]' : 'bg-[#FEF3F2] text-[#B42318]'}`}
                                >
                                  {h.passed ? 'Passed' : 'Failed'}
                                </span>
                              )}
                              {inProgress && <span className="ml-2 text-[13px] text-[#475467]">so far</span>}
                            </>
                          )}
                        </td>
                        <td className="py-3 pr-4 font-mono">{h.timeUsedSeconds === null ? '--' : formatClock(h.timeUsedSeconds)}</td>
                        <td className="py-3 text-right">
                          {link && (
                            <Link href={link.href} className="font-semibold text-[#2B44E8] no-underline">
                              {link.label}
                            </Link>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          {pages > 1 && (
            <nav aria-label="History pages" className="flex items-center gap-3 text-sm">
              {page > 1 && (
                <Link href={`/account?page=${page - 1}`} className="font-semibold text-[#2B44E8] no-underline">
                  Newer
                </Link>
              )}
              <span className="text-[#475467]">
                Page {page} of {pages}
              </span>
              {page < pages && (
                <Link href={`/account?page=${page + 1}`} className="font-semibold text-[#2B44E8] no-underline">
                  Older
                </Link>
              )}
            </nav>
          )}
        </section>

        <div className="flex justify-end">
          <LogoutButton />
        </div>
      </main>
    </QuizPage>
  )
}

export const metadata: Metadata = {
  title: 'Your profile | CertGenius',
  robots: { index: false },
}
