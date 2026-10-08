import type { Metadata } from 'next'

import configPromise from '@payload-config'
import { notFound, redirect } from 'next/navigation'
import { getPayload } from 'payload'
import React from 'react'

import { PracticeSession } from '@/components/quiz/PracticeSession'
import { feedbackFor, getOwnAttempt, getPublishedCertification, guestQuestionIds, pool, publicQuestions } from '@/quiz/server'
import type { PracticeResponses } from '@/quiz/types'
import { getStudent } from '@/utilities/getStudent'

export const dynamic = 'force-dynamic'

type Args = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ session?: string; claim?: string }>
}

// Screen 3 of content/quiz-designs. Students practise inside a saved session
// (?session=<attempt id>); guests get the certification's first 10 questions.
export default async function PracticePage({ params, searchParams }: Args) {
  const { slug } = await params
  const { session, claim } = await searchParams
  const payload = await getPayload({ config: configPromise })
  const cert = await getPublishedCertification(payload, decodeURIComponent(slug))
  if (!cert) notFound()
  const student = await getStudent()
  const certSlug = cert.slug as string

  // Signed up after using the free questions: the page turns them into a session.
  if (student && claim === '1') {
    return (
      <PracticeSession
        key="claim"
        cert={{ slug: certSlug, title: cert.title }}
        modeLabel="Practice"
        questionIds={[]}
        attemptId={null}
        initialResponses={{}}
        first={null}
        claim
        finished={false}
      />
    )
  }

  let attemptId: number | null = null
  let questionIds: number[]
  let responses: PracticeResponses = {}
  let finished = false
  let modeLabel: string

  if (student) {
    const attempt = session ? await getOwnAttempt(payload, Number(session), Number(student.id)) : null
    if (!attempt || attempt.mode !== 'practice' || attempt.certification_id !== Number(cert.id)) {
      redirect(`/certifications/${certSlug}/quiz`)
    }
    attemptId = attempt.id
    questionIds = attempt.question_ids || []
    responses = (attempt.responses || {}) as PracticeResponses
    finished = attempt.status !== 'in-progress'
    modeLabel = `Practice · ${attempt.domain_filter || 'All domains'}`
  } else {
    questionIds = await guestQuestionIds(payload, Number(cert.id))
    modeLabel = 'Practice · Free questions'
  }

  // Render the first unanswered question straight away (no loading flash).
  const firstId = questionIds.find((id) => !responses[String(id)])
  let first = null
  if (firstId && !finished) {
    const [question] = await publicQuestions(payload, [firstId], cert)
    if (question) {
      const prior = responses[String(firstId)]
      const fb = prior ? (await feedbackFor(payload, [{ questionId: firstId, chosen: prior.c }])).get(firstId) : null
      let bookmarked = false
      if (student) {
        const { rowCount } = await pool(payload).query(
          'select 1 from bookmarks where student_id = $1 and question_id = $2',
          [student.id, firstId],
        )
        bookmarked = Boolean(rowCount)
      }
      first = { question, feedback: fb ?? null, bookmarked }
    }
  }

  return (
    <PracticeSession
      // A new key resets the screen when moving from the sign-up hand-over
      // (or a guest session) to a saved session.
      key={attemptId ?? 'guest'}
      cert={{ slug: certSlug, title: cert.title }}
      modeLabel={modeLabel}
      questionIds={questionIds}
      attemptId={attemptId}
      initialResponses={responses}
      first={first}
      claim={false}
      finished={finished}
    />
  )
}

export const metadata: Metadata = {
  title: 'Practice | CertGenius',
  robots: { index: false },
}
