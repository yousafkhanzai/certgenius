import type { Metadata } from 'next'

import configPromise from '@payload-config'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getPayload } from 'payload'
import React from 'react'

import { PracticeMissedButton } from '@/components/quiz/PracticeMissedButton'
import { StudentHeader } from '@/components/quiz/StudentHeader'
import { QuizPage, card, formatClock, primaryButton, secondaryButton } from '@/components/quiz/ui'
import { examHistory, headerStats } from '@/quiz/progress'
import { getOwnAttempt, getPublishedCertification, pool } from '@/quiz/server'
import type { DomainResult, ExamResponses } from '@/quiz/types'
import { getStudent } from '@/utilities/getStudent'

export const dynamic = 'force-dynamic'

type Args = { params: Promise<{ slug: string; attemptId: string }> }

// Screen 4 of content/quiz-designs.
export default async function ResultsPage({ params }: Args) {
  const { slug, attemptId } = await params
  const payload = await getPayload({ config: configPromise })
  const cert = await getPublishedCertification(payload, decodeURIComponent(slug))
  if (!cert) notFound()
  const student = await getStudent()
  if (!student) redirect(`/login?next=${encodeURIComponent(`/certifications/${cert.slug}/results/${attemptId}`)}`)

  const attempt = await getOwnAttempt(payload, Number(attemptId), Number(student.id))
  if (!attempt || attempt.mode !== 'exam' || attempt.certification_id !== Number(cert.id)) notFound()
  if (attempt.status === 'in-progress') redirect(`/certifications/${cert.slug}/exam/${attempt.id}`)

  const certId = Number(cert.id)
  const [stats, allHistory] = await Promise.all([
    headerStats(payload, student),
    examHistory(payload, Number(student.id), certId, 50),
  ])
  const pass = cert.passingScore || 0
  const score = attempt.score_percent ?? 0
  const total = attempt.total_questions || (attempt.question_ids || []).length
  const correct = attempt.correct_count ?? 0
  const passed = Boolean(attempt.passed)

  // Exams up to and including this one (newest first), for the chart and comparisons.
  const upToThis = allHistory.filter((h) => new Date(h.submittedAt) <= new Date(attempt.submitted_at ?? Date.now()))
  const previous = upToThis.find((h) => h.id !== attempt.id)
  const chart = upToThis.slice(0, 5).reverse()
  const earlierScores = upToThis.filter((h) => h.id !== attempt.id).map((h) => h.score)
  const best = earlierScores.length > 0 && score > Math.max(...earlierScores)

  // Per-question domain and time, for the slowest domain.
  const responses = (attempt.responses || {}) as ExamResponses
  const ids = attempt.question_ids || []
  const { rows: qrows } = await pool(payload).query<{ id: number; domain_name: string | null }>(
    'select id, domain_name from questions where id = any($1::int[])',
    [ids],
  )
  const domainOf = new Map(qrows.map((r) => [r.id, r.domain_name || 'General']))
  const answeredCount = ids.filter((id) => responses[String(id)]?.c).length
  const timeUsed = attempt.time_used_seconds ?? 0
  const duration = (cert.durationMinutes || 0) * 60
  const avgPerQuestion = answeredCount ? Math.round(timeUsed / answeredCount) : 0
  const timeByDomain = new Map<string, { ms: number; n: number }>()
  for (const id of ids) {
    const t = responses[String(id)]?.t
    if (!t) continue
    const d = domainOf.get(id) || 'General'
    const cur = timeByDomain.get(d) || { ms: 0, n: 0 }
    timeByDomain.set(d, { ms: cur.ms + t, n: cur.n + 1 })
  }
  const slowest =
    timeByDomain.size > 1 ? [...timeByDomain.entries()].sort((a, b) => b[1].ms / b[1].n - a[1].ms / a[1].n)[0]?.[0] : undefined
  const bookmarkedIds = ids.filter((id) => responses[String(id)]?.b)

  const results = (attempt.domain_results || {}) as Record<string, DomainResult>
  const order = [...(cert.domains || []).map((d) => d.name), ...Object.keys(results)]
  const domainRows = Array.from(new Set(order))
    .filter((name) => results[name])
    .map((name) => {
      const r = results[name]
      const pct = r.total ? Math.round((r.correct / r.total) * 100) : 0
      const prev = previous?.domainResults[name]
      const prevPct = prev && prev.total ? Math.round((prev.correct / prev.total) * 100) : null
      return { name, pct, correct: r.correct, total: r.total, delta: prevPct === null ? null : pct - prevPct, missed: r.total - r.correct }
    })
  const weakCount = domainRows.filter((d) => d.pct < pass).length

  // Study plan: the certification's study guides, most-missed domain first.
  const plan = domainRows
    .filter((d) => d.missed > 0)
    .sort((a, b) => b.missed - a.missed)
    .map((d, i) => {
      // Read with public access, so an unpublished guide is never populated here.
      const guide = (cert.domains || []).find((x) => x.name === d.name)?.studyGuide
      const published = guide && typeof guide === 'object' && guide.slug ? guide : null
      return {
        step: i + 1,
        missed: d.missed,
        domain: d.name,
        title: published?.title || `Practice ${d.name}`,
        href: published ? `/posts/${published.slug}` : `/certifications/${cert.slug}/quiz`,
      }
    })

  const date = new Date(attempt.submitted_at ?? Date.now()).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const headline = best
    ? `Your best score yet, up ${score - Math.max(...earlierScores)} point${score - Math.max(...earlierScores) === 1 ? '' : 's'}`
    : passed
      ? 'You passed this exam simulation'
      : 'Not there yet: your study plan is below'
  const margin = Math.abs(score - pass)
  const message = passed
    ? `You cleared the ${pass}% pass mark by ${margin} point${margin === 1 ? '' : 's'}.${
        weakCount
          ? ` ${weakCount === 1 ? 'One domain is' : `${weakCount} domains are`} still below the line. Fix ${weakCount === 1 ? 'it' : 'them'} and you'll be ready for the real exam.`
          : ' Every domain is above the line.'
      }`
    : `You were ${margin} point${margin === 1 ? '' : 's'} short of the ${pass}% pass mark. Start with step 1 of your study plan.`

  const ring = 2 * Math.PI * 72
  const missedCount = total - correct

  return (
    <QuizPage>
      <StudentHeader stats={stats} next={`/certifications/${cert.slug}/results/${attempt.id}`} />
      <main className="mx-auto flex max-w-[1240px] flex-col gap-6 px-4 pb-[72px] pt-8 sm:px-6">
        <section className="flex flex-wrap items-center gap-9 rounded-[24px] bg-[#0B1220] p-6 text-white sm:p-9">
          <div className="relative h-[168px] w-[168px] flex-none">
            <svg width="168" height="168" viewBox="0 0 168 168" role="img" aria-label={`Score ${score}%, pass mark ${pass}%`}>
              <circle cx="84" cy="84" r="72" fill="none" stroke="#1F2A3D" strokeWidth="14" />
              <circle
                cx="84"
                cy="84"
                r="72"
                fill="none"
                stroke={passed ? '#7CF2B0' : '#F97066'}
                strokeWidth="14"
                strokeLinecap="round"
                strokeDasharray={`${(score / 100) * ring} ${ring}`}
                transform="rotate(-90 84 84)"
              />
              {/* Pass-mark tick */}
              <circle
                cx="84"
                cy="84"
                r="72"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="3"
                strokeDasharray={`2 ${ring - 2}`}
                strokeDashoffset={-((pass / 100) * ring) + 1}
                transform="rotate(-90 84 84)"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[44px] font-extrabold tracking-[-0.04em]">{score}%</span>
              <span className="text-[13px] text-[#98A2B3]">
                {correct} of {total}
              </span>
            </div>
          </div>

          <div className="flex flex-[1_1_340px] flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <span
                className={`rounded-full px-3 py-1.5 text-sm font-bold ${passed ? 'bg-[#7CF2B0] text-[#053321]' : 'bg-[#FEE4E2] text-[#912018]'}`}
              >
                {passed ? 'Passed' : 'Failed'}
              </span>
              <span className="text-sm text-[#98A2B3]">
                {cert.title} · Exam simulation · {date}
              </span>
            </div>
            <h1 className="m-0 text-[28px] font-extrabold leading-[1.15] tracking-[-0.03em] sm:text-[34px]">{headline}</h1>
            <p className="m-0 max-w-[560px] text-base leading-[1.6] text-[#C2C9D6]">{message}</p>
          </div>

          <div className="flex flex-[1_1_260px] flex-col gap-2.5">
            <span className="text-xs font-bold tracking-[0.06em] text-[#98A2B3]">
              LAST {chart.length} EXAM{chart.length === 1 ? '' : 'S'}
            </span>
            <div className="relative flex h-[110px] items-end gap-2.5 border-b border-[#1F2A3D]">
              <span
                className="absolute inset-x-0 border-t border-dashed border-[#475467]"
                style={{ bottom: `${Math.round(pass * 0.9)}px` }}
                aria-hidden="true"
              />
              {chart.map((h) => (
                <div key={h.id} className="flex h-[110px] flex-1 flex-col items-center justify-end gap-1.5">
                  <span className="text-xs font-semibold text-[#C2C9D6]">{h.score}%</span>
                  <span
                    className="block w-full max-w-[34px] rounded-t-md"
                    style={{
                      height: `${Math.max(2, Math.round(h.score * 0.9))}px`,
                      background: h.id === attempt.id ? '#7CF2B0' : '#2A3850',
                    }}
                  />
                </div>
              ))}
            </div>
            <span className="text-xs text-[#98A2B3]">Dashed line: {pass}% pass score</span>
          </div>
        </section>

        <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
          <div className="flex flex-col gap-1.5 rounded-[18px] border border-[#E4E7EC] bg-white p-5">
            <span className="text-[13px] text-[#475467]">Time used</span>
            <span className="font-mono text-[26px] font-semibold">{formatClock(timeUsed)}</span>
            <span className="text-[13px] text-[#475467]">
              {duration ? `${formatClock(Math.max(0, duration - timeUsed))} left on the clock` : 'No time limit'}
            </span>
          </div>
          <div className="flex flex-col gap-1.5 rounded-[18px] border border-[#E4E7EC] bg-white p-5">
            <span className="text-[13px] text-[#475467]">Average per question</span>
            <span className="font-mono text-[26px] font-semibold">{avgPerQuestion}s</span>
            <span className="text-[13px] text-[#475467]">
              {slowest ? `Slowest on ${slowest} questions` : `${answeredCount} of ${total} answered`}
            </span>
          </div>
          <div className="flex flex-col gap-1.5 rounded-[18px] border border-[#E4E7EC] bg-white p-5">
            <span className="text-[13px] text-[#475467]">Bookmarked</span>
            <span className="text-[26px] font-extrabold">{bookmarkedIds.length}</span>
            {bookmarkedIds.length > 0 ? (
              <Link
                href={`/certifications/${cert.slug}/results/${attempt.id}/review?show=bookmarked`}
                className="text-[13px] font-semibold text-[#2B44E8] no-underline hover:text-[#1A2DB0]"
              >
                Review bookmarked questions
              </Link>
            ) : (
              <span className="text-[13px] text-[#475467]">None in this exam</span>
            )}
          </div>
        </div>

        <section aria-label="Score by domain" className={`${card} flex flex-col gap-[22px] p-7 shadow-none`}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="m-0 text-xl font-bold tracking-[-0.02em]">Score by domain</h2>
            <span className="text-[13px] text-[#475467]">
              Black line: {pass}% pass score{previous ? ' · change vs last exam' : ''}
            </span>
          </div>
          {domainRows.map((d) => (
            <div key={d.name} className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-3 text-[15px]">
                <span className="font-semibold">{d.name}</span>
                <span className="flex items-baseline gap-2.5 whitespace-nowrap">
                  <span className="font-bold">{d.pct}%</span>
                  <span className="text-[13px] text-[#475467]">
                    {d.correct}/{d.total}
                  </span>
                  {d.delta !== null && (
                    <span className={`text-[13px] font-bold ${d.delta >= 0 ? 'text-[#067647]' : 'text-[#B42318]'}`}>
                      {d.delta >= 0 ? '+' : ''}
                      {d.delta}
                    </span>
                  )}
                </span>
              </div>
              <div className="relative h-2.5 rounded-full bg-[#EEF0F3]">
                <span
                  className="absolute left-0 top-0 h-2.5 rounded-full"
                  style={{ width: `${d.pct}%`, background: d.pct < pass ? '#DC6803' : '#2B44E8' }}
                />
                <span className="absolute -top-1 h-[18px] w-0.5 bg-[#0B1220]" style={{ left: `${pass}%` }} aria-hidden="true" />
              </div>
            </div>
          ))}
        </section>

        {plan.length > 0 && (
          <section aria-label="Your study plan" className={`${card} flex flex-col gap-[18px] p-7 shadow-none`}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="m-0 text-xl font-bold tracking-[-0.02em]">Your study plan</h2>
              <span className="text-[13px] text-[#475467]">Ordered by how many questions you missed in each domain</span>
            </div>
            <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
              {plan.map((p) => (
                <Link
                  key={p.domain}
                  href={p.href}
                  className="flex flex-col gap-2.5 rounded-2xl border border-[#E4E7EC] p-[18px] text-[#0B1220] no-underline hover:border-[#2B44E8] hover:text-[#0B1220]"
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[13px] font-semibold text-[#475467]">STEP {p.step}</span>
                    <span className="rounded-full bg-[#EEF1FF] px-2 py-1 text-xs font-bold text-[#2B44E8]">{p.missed} missed</span>
                  </span>
                  <span className="text-base font-bold leading-[1.35]">{p.title}</span>
                  <span className="text-[13px] text-[#475467]">{p.domain}</span>
                  <span className="text-sm font-semibold text-[#2B44E8]">Read guide, then practice</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <div className="flex flex-wrap justify-end gap-3">
          <Link
            href={`/certifications/${cert.slug}/results/${attempt.id}/review`}
            className={`${secondaryButton} h-[52px] text-[15px] font-bold`}
          >
            Review all {total} answers
          </Link>
          {missedCount > 0 && <PracticeMissedButton certSlug={cert.slug as string} attemptId={attempt.id} count={missedCount} />}
          <Link href={`/certifications/${cert.slug}/quiz`} className={`${primaryButton} h-[52px] text-[15px]`}>
            Take another exam
          </Link>
        </div>
      </main>
    </QuizPage>
  )
}

export const metadata: Metadata = {
  title: 'Exam results | CertGenius',
  robots: { index: false },
}
