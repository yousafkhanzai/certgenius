import type { Metadata } from 'next'

import configPromise from '@payload-config'
import { notFound, redirect } from 'next/navigation'
import { getPayload } from 'payload'
import React from 'react'

import { ExamSession } from '@/components/quiz/ExamSession'
import {
  DEADLINE_GRACE_MS,
  getOwnAttempt,
  getPublishedCertification,
  gradeExam,
  publicQuestions,
} from '@/quiz/server'
import type { ExamResponses } from '@/quiz/types'
import { getStudent } from '@/utilities/getStudent'

export const dynamic = 'force-dynamic'

type Args = { params: Promise<{ slug: string; attemptId: string }> }

// Screen 2 of content/quiz-designs. No answers, hints or explanations are
// sent to the browser here: grading happens on the server after submitting.
export default async function ExamPage({ params }: Args) {
  const { slug, attemptId } = await params
  const payload = await getPayload({ config: configPromise })
  const cert = await getPublishedCertification(payload, decodeURIComponent(slug))
  if (!cert) notFound()
  const student = await getStudent()
  if (!student) redirect(`/login?next=${encodeURIComponent(`/certifications/${cert.slug}/quiz`)}`)

  const attempt = await getOwnAttempt(payload, Number(attemptId), Number(student.id))
  if (!attempt || attempt.mode !== 'exam' || attempt.certification_id !== Number(cert.id)) notFound()

  const resultsUrl = `/certifications/${cert.slug}/results/${attempt.id}`
  if (attempt.status !== 'in-progress') redirect(resultsUrl)
  // Time ran out while the student was away: grade what was saved.
  if (attempt.deadline && Date.now() > new Date(attempt.deadline).getTime() + DEADLINE_GRACE_MS) {
    await gradeExam(payload, attempt, cert)
    redirect(resultsUrl)
  }

  const questions = await publicQuestions(payload, attempt.question_ids || [], cert)
  // The hint is a practice-mode feature; the exam never shows it.
  const examQuestions = questions.map((q) => ({ ...q, hint: null, studyGuide: null }))

  return (
    <ExamSession
      attemptId={attempt.id}
      cert={{ slug: cert.slug as string, title: cert.title, examCode: cert.examCode ?? null }}
      questions={examQuestions}
      initialResponses={(attempt.responses || {}) as ExamResponses}
      initialIndex={attempt.current_index || 0}
      deadline={new Date(attempt.deadline ?? Date.now()).toISOString()}
      serverNow={Date.now()}
      durationSeconds={(cert.durationMinutes || 0) * 60 || Math.round((new Date(attempt.deadline ?? 0).getTime() - new Date(attempt.started_at).getTime()) / 1000)}
    />
  )
}

export const metadata: Metadata = {
  title: 'Exam simulation | CertGenius',
  robots: { index: false },
}
