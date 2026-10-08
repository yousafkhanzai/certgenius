import type { Pool, PoolClient } from 'pg'
import type { Payload } from 'payload'

import type { Certification } from '@/payload-types'
import {
  GUEST_FREE_QUESTIONS,
  LETTERS,
  STATS_MIN_ANSWERS,
  type DomainResult,
  type ExamResponses,
  type Feedback,
  type Letter,
  type PublicQuestion,
  type StudyGuide,
} from './types'

// All quiz reads and writes go through here. Answer keys are only ever read
// on the server; the browser gets PublicQuestion before answering and
// Feedback after.

export const pool = (payload: Payload): Pool => (payload.db as unknown as { pool: Pool }).pool

type QuestionRow = {
  id: number
  certification_id: number
  domain_name: string | null
  question_text: string
  option_a: string | null
  option_b: string | null
  option_c: string | null
  option_d: string | null
  correct_answer: Letter | null
  explanation: string | null
  why_a: string | null
  why_b: string | null
  why_c: string | null
  why_d: string | null
  hint: string | null
  level: 'easy' | 'medium' | 'hard' | null
  blog_post_url: string | null
  reference_url: string | null
}

// ---------- certifications ----------

// Published certifications only: drafts never reach a quiz.
export async function getPublishedCertification(payload: Payload, slug: string) {
  const res = await payload.find({
    collection: 'certifications',
    where: { slug: { equals: slug } },
    depth: 1,
    limit: 1,
    overrideAccess: false,
  })
  return res.docs[0] ?? null
}

export async function getPublishedCertificationById(payload: Payload, id: number) {
  const res = await payload.find({
    collection: 'certifications',
    where: { id: { equals: id } },
    depth: 1,
    limit: 1,
    overrideAccess: false,
  })
  return res.docs[0] ?? null
}

export async function domainQuestionCounts(payload: Payload, certId: number): Promise<Map<string, number>> {
  const { rows } = await pool(payload).query<{ domain_name: string; n: number }>(
    `select domain_name, count(*)::int as n from questions
     where certification_id = $1 and option_a is not null and correct_answer is not null
     group by domain_name`,
    [certId],
  )
  return new Map(rows.map((r) => [r.domain_name, r.n]))
}

// ---------- question selection ----------

const PLAYABLE = `option_a is not null and option_b is not null and option_c is not null
  and option_d is not null and correct_answer is not null`

// Guests may only ever see these: the first 10 questions of a certification.
export async function guestQuestionIds(payload: Payload, certId: number): Promise<number[]> {
  const { rows } = await pool(payload).query<{ id: number }>(
    `select id from questions where certification_id = $1 and ${PLAYABLE} order by id limit $2`,
    [certId, GUEST_FREE_QUESTIONS],
  )
  return rows.map((r) => r.id)
}

export async function pickPracticeQuestions(
  payload: Payload,
  certId: number,
  domain: string | null,
  count: number, // 0 = all
  exclude: number[] = [],
): Promise<number[]> {
  const params: unknown[] = [certId, exclude]
  let sql = `select id from questions where certification_id = $1 and ${PLAYABLE} and not (id = any($2::int[]))`
  if (domain) {
    params.push(domain)
    sql += ` and domain_name = $${params.length}`
  }
  sql += ' order by random()'
  if (count > 0) {
    params.push(count)
    sql += ` limit $${params.length}`
  }
  const { rows } = await pool(payload).query<{ id: number }>(sql, params)
  return rows.map((r) => r.id)
}

// Exam: examQuestionCount questions, split across domains by weight (largest
// remainder), random within each domain, topped up from any domain if a
// domain runs short, then shuffled.
export async function pickExamQuestions(payload: Payload, cert: Certification): Promise<number[]> {
  const certId = Number(cert.id)
  const available = await domainQuestionCounts(payload, certId)
  const totalAvailable = [...available.values()].reduce((a, b) => a + b, 0)
  const target = Math.min(cert.examQuestionCount || totalAvailable, totalAvailable)

  const domains = (cert.domains || []).filter((d) => (available.get(d.name) || 0) > 0)
  const weightSum = domains.reduce((s, d) => s + (d.weight || 0), 0) || domains.length
  const shares = domains.map((d) => {
    const exact = (target * (d.weight || (weightSum === domains.length ? 1 : 0))) / weightSum
    return { name: d.name, n: Math.floor(exact), rest: exact - Math.floor(exact) }
  })
  let missing = target - shares.reduce((s, d) => s + d.n, 0)
  for (const s of [...shares].sort((a, b) => b.rest - a.rest)) {
    if (missing <= 0) break
    s.n++
    missing--
  }

  const picked: number[] = []
  for (const s of shares) {
    const ids = await pickPracticeQuestions(payload, certId, s.name, Math.min(s.n, available.get(s.name) || 0), picked)
    picked.push(...ids)
  }
  if (picked.length < target) {
    picked.push(...(await pickPracticeQuestions(payload, certId, null, target - picked.length, picked)))
  }
  for (let i = picked.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[picked[i], picked[j]] = [picked[j], picked[i]]
  }
  return picked
}

// ---------- question data ----------

async function loadRows(payload: Payload, ids: number[]): Promise<Map<number, QuestionRow>> {
  if (!ids.length) return new Map()
  const { rows } = await pool(payload).query<QuestionRow>(
    `select id, certification_id, domain_name, question_text, option_a, option_b, option_c, option_d,
            correct_answer, explanation, why_a, why_b, why_c, why_d, hint, level, blog_post_url, reference_url
     from questions where id = any($1::int[])`,
    [ids],
  )
  return new Map(rows.map((r) => [r.id, r]))
}

// Study guide for a question: its own blog_post_url when that points at one
// of our posts, otherwise the post linked to its domain on the certification.
async function studyGuides(
  payload: Payload,
  rows: QuestionRow[],
  cert: Certification,
): Promise<Map<number, StudyGuide | null>> {
  const postSlug = (url: string | null) => url?.match(/^\/(?:blog|posts)\/([a-z0-9-]+)\/?$/)?.[1] ?? null
  const slugs = Array.from(new Set(rows.map((r) => postSlug(r.blog_post_url)).filter(Boolean))) as string[]
  const posts = slugs.length
    ? await payload.find({
        collection: 'posts',
        where: { slug: { in: slugs } },
        depth: 0,
        limit: slugs.length,
        overrideAccess: false,
        select: { title: true, slug: true },
      })
    : { docs: [] }
  const bySlug = new Map(posts.docs.map((p) => [p.slug, p.title]))
  const counts = await domainQuestionCounts(payload, Number(cert.id))

  const result = new Map<number, StudyGuide | null>()
  for (const r of rows) {
    const domainCount = counts.get(r.domain_name || '') || 0
    const slug = postSlug(r.blog_post_url)
    if (slug && bySlug.has(slug)) {
      result.set(r.id, { title: bySlug.get(slug) as string, url: `/posts/${slug}`, domainQuestionCount: domainCount })
      continue
    }
    // The certification is read with public access, so only published
    // guides are populated here.
    const guide = (cert.domains || []).find((d) => d.name === r.domain_name)?.studyGuide
    if (guide && typeof guide === 'object' && guide.slug) {
      result.set(r.id, { title: guide.title, url: `/posts/${guide.slug}`, domainQuestionCount: domainCount })
      continue
    }
    result.set(r.id, null)
  }
  return result
}

// Question data safe to send before an answer: no correct answer, explanation or whys.
export async function publicQuestions(
  payload: Payload,
  ids: number[],
  cert: Certification,
): Promise<PublicQuestion[]> {
  const rows = await loadRows(payload, ids)
  const guides = await studyGuides(payload, [...rows.values()], cert)
  return ids
    .map((id) => rows.get(id))
    .filter((r): r is QuestionRow => Boolean(r))
    .map((r) => ({
      id: r.id,
      text: r.question_text,
      options: LETTERS.map((letter) => ({ letter, text: r[`option_${letter.toLowerCase()}` as 'option_a'] || '' })),
      domain: r.domain_name || 'General',
      level: r.level,
      hint: r.hint,
      studyGuide: guides.get(r.id) ?? null,
    }))
}

async function optionStats(payload: Payload, ids: number[]): Promise<Map<number, Record<Letter, number>>> {
  if (!ids.length) return new Map()
  const { rows } = await pool(payload).query<{
    question_id: number
    count_a: number
    count_b: number
    count_c: number
    count_d: number
    total: number
  }>(`select question_id, count_a, count_b, count_c, count_d, total from answer_stats where question_id = any($1::int[])`, [
    ids,
  ])
  const map = new Map<number, Record<Letter, number>>()
  for (const r of rows) {
    if (r.total < STATS_MIN_ANSWERS) continue
    const pct = (n: number) => Math.round(((n || 0) / r.total) * 100)
    map.set(r.question_id, { A: pct(r.count_a), B: pct(r.count_b), C: pct(r.count_c), D: pct(r.count_d) })
  }
  return map
}

// Full answer feedback for questions the student has already answered.
export async function feedbackFor(
  payload: Payload,
  answers: { questionId: number; chosen: Letter }[],
): Promise<Map<number, Feedback>> {
  const ids = answers.map((a) => a.questionId)
  const rows = await loadRows(payload, ids)
  const stats = await optionStats(payload, ids)
  const map = new Map<number, Feedback>()
  for (const a of answers) {
    const r = rows.get(a.questionId)
    if (!r || !r.correct_answer) continue
    const why: Partial<Record<Letter, string>> = {}
    for (const l of LETTERS) {
      const w = r[`why_${l.toLowerCase()}` as 'why_a']
      if (w) why[l] = w
    }
    map.set(r.id, {
      questionId: r.id,
      chosen: a.chosen,
      correct: r.correct_answer,
      isCorrect: a.chosen === r.correct_answer,
      explanation: r.explanation,
      why,
      // The "why" written for the correct option is the takeaway line
      // (without a leading "Correct." that only makes sense next to the option).
      remember: why[r.correct_answer]?.replace(/^(correct|right)\s*[.:!-]?\s*/i, '') || null,
      referenceUrl: r.reference_url,
      stats: stats.get(r.id) ?? null,
    })
  }
  return map
}

export async function correctAnswers(payload: Payload, ids: number[]) {
  return loadRows(payload, ids)
}

// ---------- recording answers ----------

type RecordedAnswer = {
  questionId: number
  certificationId: number
  domain: string | null
  chosen: Letter
  isCorrect: boolean
}

// Saves answers, bumps the per-option statistics and the student's streak,
// all inside the caller's transaction.
export async function recordAnswers(
  client: PoolClient,
  studentId: number,
  attemptId: number,
  answers: RecordedAnswer[],
): Promise<void> {
  if (!answers.length) return
  const now = new Date().toISOString()
  for (const a of answers) {
    await client.query(
      `insert into attempt_answers (attempt_id, student_id, question_id, certification_id, domain_name, chosen, is_correct, answered_at, updated_at, created_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $8, $8)`,
      [attemptId, studentId, a.questionId, a.certificationId, a.domain, a.chosen, a.isCorrect, now],
    )
    const col = `count_${a.chosen.toLowerCase()}`
    await client.query(
      `insert into answer_stats (question_id, count_a, count_b, count_c, count_d, total, updated_at, created_at)
       values ($1, $2, $3, $4, $5, 1, now(), now())
       on conflict (question_id) do update set ${col} = answer_stats.${col} + 1, total = answer_stats.total + 1, updated_at = now()`,
      [a.questionId, a.chosen === 'A' ? 1 : 0, a.chosen === 'B' ? 1 : 0, a.chosen === 'C' ? 1 : 0, a.chosen === 'D' ? 1 : 0],
    )
  }
  // Streak: same day keeps it, the next day extends it, a gap restarts it (UTC days).
  await client.query(
    `update students set
       current_streak = case
         when last_active_date::date = current_date then greatest(current_streak, 1)
         when last_active_date::date = current_date - 1 then coalesce(current_streak, 0) + 1
         else 1 end,
       longest_streak = greatest(coalesce(longest_streak, 0), case
         when last_active_date::date = current_date then greatest(current_streak, 1)
         when last_active_date::date = current_date - 1 then coalesce(current_streak, 0) + 1
         else 1 end),
       last_active_date = now()
     where id = $1`,
    [studentId],
  )
}

export async function withTransaction<T>(payload: Payload, fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool(payload).connect()
  try {
    await client.query('begin')
    const result = await fn(client)
    await client.query('commit')
    return result
  } catch (err) {
    await client.query('rollback')
    throw err
  } finally {
    client.release()
  }
}

// ---------- attempts ----------

export type AttemptRow = {
  id: number
  student_id: number
  certification_id: number
  mode: 'practice' | 'exam'
  status: 'in-progress' | 'submitted' | 'abandoned'
  domain_filter: string | null
  question_ids: number[] | null
  responses: Record<string, unknown> | null
  current_index: number | null
  started_at: Date
  deadline: Date | null
  submitted_at: Date | null
  time_used_seconds: number | null
  total_questions: number | null
  correct_count: number | null
  score_percent: number | null
  passed: boolean | null
  domain_results: Record<string, DomainResult> | null
}

// An attempt, only if it belongs to this student.
export async function getOwnAttempt(payload: Payload, attemptId: number, studentId: number): Promise<AttemptRow | null> {
  if (!Number.isInteger(attemptId)) return null
  const { rows } = await pool(payload).query<AttemptRow>(`select * from attempts where id = $1 and student_id = $2`, [
    attemptId,
    studentId,
  ])
  return rows[0] ?? null
}

export async function createAttempt(
  payload: Payload,
  data: {
    studentId: number
    certificationId: number
    mode: 'practice' | 'exam'
    domainFilter: string | null
    questionIds: number[]
    deadline: Date | null
    responses?: Record<string, unknown>
  },
): Promise<number> {
  const { rows } = await pool(payload).query<{ id: number }>(
    `insert into attempts (student_id, certification_id, mode, status, domain_filter, question_ids, responses, current_index,
       started_at, deadline, total_questions, correct_count, updated_at, created_at)
     values ($1, $2, $3, 'in-progress', $4, $5, $6, 0, now(), $7, $8, 0, now(), now()) returning id`,
    [
      data.studentId,
      data.certificationId,
      data.mode,
      data.domainFilter,
      JSON.stringify(data.questionIds),
      JSON.stringify(data.responses || {}),
      data.deadline,
      data.questionIds.length,
    ],
  )
  return rows[0].id
}

// Grades an exam attempt from its saved responses. Runs once: the status
// guard makes a double submit (button + timer at 00:00) harmless.
export async function gradeExam(payload: Payload, attempt: AttemptRow, cert: Certification): Promise<void> {
  const ids = attempt.question_ids || []
  const responses = (attempt.responses || {}) as ExamResponses
  const rows = await loadRows(payload, ids)
  const domainResults: Record<string, DomainResult> = {}
  const recorded: RecordedAnswer[] = []
  let correct = 0
  for (const id of ids) {
    const r = rows.get(id)
    if (!r) continue
    const domain = r.domain_name || 'General'
    domainResults[domain] ||= { correct: 0, total: 0 }
    domainResults[domain].total++
    const chosen = responses[String(id)]?.c
    const ok = Boolean(chosen && chosen === r.correct_answer)
    if (ok) {
      correct++
      domainResults[domain].correct++
    }
    if (chosen) {
      recorded.push({ questionId: id, certificationId: r.certification_id, domain: r.domain_name, chosen, isCorrect: ok })
    }
  }
  const total = ids.length
  const score = total ? Math.round((correct / total) * 100) : 0
  const durationSec = (cert.durationMinutes || 0) * 60
  const elapsed = Math.round((Date.now() - new Date(attempt.started_at).getTime()) / 1000)
  const timeUsed = durationSec ? Math.min(elapsed, durationSec) : elapsed

  await withTransaction(payload, async (client) => {
    const claimed = await client.query(
      `update attempts set status = 'submitted', submitted_at = now(), time_used_seconds = $2, correct_count = $3,
         score_percent = $4, passed = $5, domain_results = $6, updated_at = now()
       where id = $1 and status = 'in-progress' returning id`,
      [attempt.id, timeUsed, correct, score, score >= (cert.passingScore || 0), JSON.stringify(domainResults)],
    )
    if (!claimed.rowCount) return // already submitted
    await recordAnswers(client, attempt.student_id, attempt.id, recorded)
  })
}

// Grace period for the network after the clock hits 00:00.
export const DEADLINE_GRACE_MS = 30_000
