import type { Metadata } from 'next'

import configPromise from '@payload-config'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import React from 'react'

import { CERT_CATEGORIES } from '@/collections/Certifications/options'
import { MasteryCards, ModeCards } from '@/components/quiz/ModeCards'
import { StudentHeader } from '@/components/quiz/StudentHeader'
import { QuizPage } from '@/components/quiz/ui'
import { examHistory, headerStats, masteryByDomain, readinessFrom, unfinishedExam } from '@/quiz/progress'
import { domainQuestionCounts, getPublishedCertification } from '@/quiz/server'
import { getStudent } from '@/utilities/getStudent'

export const dynamic = 'force-dynamic'

type Args = { params: Promise<{ slug: string }> }

// Screen 1 of content/quiz-designs: choose practice or exam simulation.
export default async function QuizStartPage({ params }: Args) {
  const { slug } = await params
  const payload = await getPayload({ config: configPromise })
  const cert = await getPublishedCertification(payload, decodeURIComponent(slug))
  if (!cert) notFound()
  const certId = Number(cert.id)
  const student = await getStudent()

  const counts = await domainQuestionCounts(payload, certId)
  const totalQuestions = [...counts.values()].reduce((a, b) => a + b, 0)
  const [stats, history, mastery, unfinished] = student
    ? await Promise.all([
        headerStats(payload, student),
        examHistory(payload, Number(student.id), certId),
        masteryByDomain(payload, Number(student.id), certId),
        unfinishedExam(payload, Number(student.id), certId),
      ])
    : [null, [], new Map<string, number>(), null]

  const domains = (cert.domains || []).map((d) => ({
    name: d.name,
    questions: counts.get(d.name) || 0,
    mastered: mastery.get(d.name) || 0,
  }))
  const readiness = readinessFrom(history)
  const pass = cert.passingScore || 0
  const weakest = [...domains]
    .filter((d) => d.questions > 0)
    .sort((a, b) => a.mastered / a.questions - b.mastered / b.questions)[0]
  const category = CERT_CATEGORIES.find((c) => c.value === cert.certCategory)?.label
  const updated = new Date(cert.updatedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  const examQuestions = Math.min(cert.examQuestionCount || totalQuestions, totalQuestions)
  const ring = 2 * Math.PI * 48

  let readinessTitle = 'Not measured yet'
  let readinessText = student
    ? 'Take an exam simulation to see how ready you are for the real exam.'
    : 'Sign up free, then take an exam simulation to see how ready you are.'
  if (readiness.score !== null) {
    readinessTitle = readiness.score >= pass ? 'On track to pass' : 'Not ready yet'
    const change =
      readiness.change === null
        ? 'Based on your exam simulations.'
        : readiness.change === 0
          ? 'Same score as your previous exam.'
          : `${readiness.change > 0 ? 'Up' : 'Down'} ${Math.abs(readiness.change)} point${Math.abs(readiness.change) === 1 ? '' : 's'} since your previous exam.`
    readinessText = weakest ? `${change} Focus on ${weakest.name}.` : change
  }

  return (
    <QuizPage>
      <StudentHeader stats={stats} active="certifications" next={`/certifications/${cert.slug}/quiz`} />
      <main className="mx-auto flex max-w-[1240px] flex-col gap-7 px-4 pb-[72px] pt-8 sm:px-6">
        <nav aria-label="Breadcrumb" className="flex flex-wrap gap-2 text-sm text-[#475467]">
          <Link href="/certifications" className="text-[#475467] no-underline hover:text-[#0B1220]">
            Certifications
          </Link>
          {category && (
            <>
              <span aria-hidden="true">/</span>
              <span>{category}</span>
            </>
          )}
          <span aria-hidden="true">/</span>
          <Link href={`/certifications/${cert.slug}`} className="font-semibold text-[#0B1220] no-underline">
            {cert.title}
          </Link>
        </nav>

        <section className="flex flex-wrap items-stretch gap-6">
          <div className="flex min-w-0 flex-[999_1_560px] flex-col justify-center gap-3.5">
            <div className="flex flex-wrap items-center gap-2">
              {cert.examCode && (
                <span
                  className="rounded-md bg-[#0B1220] px-[9px] py-[5px] font-mono text-xs font-semibold text-white"
                  title={cert.isSiteCode ? 'CertGenius code (the vendor has no official exam code)' : 'Official exam code'}
                >
                  {cert.examCode}
                </span>
              )}
              <span className="text-[13px] font-medium text-[#475467]">
                {[cert.vendor, `${totalQuestions} questions`, `${domains.length} domains`, `Updated ${updated}`]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </div>
            <h1 className="m-0 text-[34px] font-extrabold leading-[1.05] tracking-[-0.035em] sm:text-[48px]">{cert.title}</h1>
            <div className="flex flex-wrap gap-7 text-[15px] text-[#475467]">
              {cert.examQuestionCount ? (
                <span>
                  <strong className="font-bold text-[#0B1220]">{cert.examQuestionCount}</strong> questions
                </span>
              ) : null}
              {cert.durationMinutes ? (
                <span>
                  <strong className="font-bold text-[#0B1220]">{cert.durationMinutes} min</strong> time limit
                </span>
              ) : null}
              {pass ? (
                <span>
                  <strong className="font-bold text-[#0B1220]">{pass}%</strong> to pass
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex flex-[1_1_360px] items-center gap-[22px] rounded-[20px] bg-[#0B1220] p-6 text-white">
            <div className="relative h-28 w-28 flex-none">
              <svg width="112" height="112" viewBox="0 0 112 112" aria-hidden="true">
                <circle cx="56" cy="56" r="48" fill="none" stroke="#1F2A3D" strokeWidth="10" />
                {readiness.score !== null && (
                  <circle
                    cx="56"
                    cy="56"
                    r="48"
                    fill="none"
                    stroke="#7CF2B0"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={`${(readiness.score / 100) * ring} ${ring}`}
                    transform="rotate(-90 56 56)"
                  />
                )}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[30px] font-extrabold tracking-[-0.03em]">
                  {readiness.score === null ? '--' : `${readiness.score}%`}
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] font-semibold tracking-[0.04em] text-[#98A2B3]">EXAM READINESS</span>
              <span className="text-xl font-bold leading-[1.25]">{readinessTitle}</span>
              <span className="text-sm leading-normal text-[#C2C9D6]">{readinessText}</span>
            </div>
          </div>
        </section>

        <ModeCards
          certSlug={cert.slug as string}
          loggedIn={Boolean(student)}
          domains={domains}
          examQuestions={examQuestions}
          examMinutes={cert.durationMinutes || examQuestions}
          passScore={pass}
          unfinishedExam={
            unfinished
              ? { id: unfinished.id, secondsLeft: Math.round((new Date(unfinished.deadline).getTime() - Date.now()) / 1000) }
              : null
          }
        />

        {domains.length > 0 && <MasteryCards certSlug={cert.slug as string} loggedIn={Boolean(student)} domains={domains} />}
      </main>
    </QuizPage>
  )
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { slug } = await params
  const payload = await getPayload({ config: configPromise })
  const cert = await getPublishedCertification(payload, decodeURIComponent(slug))
  return {
    title: cert ? `${cert.title} practice and exam simulation | CertGenius` : 'Practice | CertGenius',
    robots: { index: false },
  }
}
