import { addDataAndFileToRequest, type Endpoint, type PayloadRequest } from 'payload'

import { isStudentUser } from '@/access/roles'
import {
  DEADLINE_GRACE_MS,
  createAttempt,
  feedbackFor,
  getOwnAttempt,
  getPublishedCertification,
  getPublishedCertificationById,
  gradeExam,
  guestQuestionIds,
  pickExamQuestions,
  pickPracticeQuestions,
  pool,
  publicQuestions,
  recordAnswers,
  withTransaction,
  correctAnswers,
} from './server'
import {
  LETTERS,
  isLetter,
  type ExamResponse,
  type ExamResponses,
  type Letter,
  type PracticeResponses,
} from './types'

// Quiz API (mounted under /api/quiz/...). Every handler re-checks who is
// asking: guests can only touch a certification's first 10 questions, and a
// student can only read or change their own attempts. Scores are always
// computed here, never trusted from the browser.

type Json = Record<string, unknown>

const json = (data: unknown, status = 200) => Response.json(data, { status })
const fail = (message: string, status = 400) => json({ error: message }, status)

async function body(req: PayloadRequest): Promise<Json> {
  await addDataAndFileToRequest(req)
  return (req.data && typeof req.data === 'object' ? req.data : {}) as Json
}

const asInt = (v: unknown): number | null => {
  const n = typeof v === 'string' ? Number(v) : v
  return typeof n === 'number' && Number.isInteger(n) && n > 0 ? n : null
}
const asString = (v: unknown, max = 200): string | null =>
  typeof v === 'string' && v.trim() && v.length <= max ? v.trim() : null

const studentId = (req: PayloadRequest): number | null => (isStudentUser(req) && req.user ? Number(req.user.id) : null)

const endpoint = (path: string, handler: (req: PayloadRequest) => Promise<Response>): Endpoint => ({
  path,
  method: 'post',
  handler: async (req) => {
    try {
      return await handler(req)
    } catch (err) {
      req.payload.logger.error({ err }, `quiz endpoint ${path} failed`)
      return fail('Something went wrong. Please try again.', 500)
    }
  },
})

// ---------- practice ----------

// Which questions may this request see for this certification?
async function practiceScope(req: PayloadRequest, data: Json) {
  const slug = asString(data.certSlug)
  if (!slug) return { error: fail('Missing certification.') }
  const cert = await getPublishedCertification(req.payload, slug)
  if (!cert) return { error: fail('Certification not found.', 404) }

  const sid = studentId(req)
  const attemptId = asInt(data.attemptId)
  if (attemptId) {
    if (!sid) return { error: fail('Please log in again.', 401) }
    const attempt = await getOwnAttempt(req.payload, attemptId, sid)
    if (!attempt || attempt.mode !== 'practice' || attempt.certification_id !== Number(cert.id)) {
      return { error: fail('Practice session not found.', 404) }
    }
    return { cert, sid, attempt, allowed: new Set(attempt.question_ids || []) }
  }
  // Guests (and students previewing as a guest) only get the free questions.
  return { cert, sid: null, attempt: null, allowed: new Set(await guestQuestionIds(req.payload, Number(cert.id))) }
}

const practiceStart = endpoint('/quiz/practice/start', async (req) => {
  const sid = studentId(req)
  if (!sid) return fail('Please log in to start a practice session.', 401)
  const data = await body(req)
  const slug = asString(data.certSlug)
  const cert = slug ? await getPublishedCertification(req.payload, slug) : null
  if (!cert) return fail('Certification not found.', 404)
  const certId = Number(cert.id)

  const domains = new Set((cert.domains || []).map((d) => d.name))
  const domain = asString(data.domain)
  if (domain && !domains.has(domain)) return fail('Unknown domain.')
  const count = [10, 25, 50, 0].includes(Number(data.count)) ? Number(data.count) : 25

  // Practise the questions missed in one of this student's exams.
  const fromAttempt = asInt(data.fromAttempt)
  if (fromAttempt) {
    const exam = await getOwnAttempt(req.payload, fromAttempt, sid)
    if (!exam || exam.mode !== 'exam' || exam.status !== 'submitted' || exam.certification_id !== certId) {
      return fail('Exam not found.', 404)
    }
    const { rows } = await pool(req.payload).query<{ question_id: number }>(
      `select question_id from attempt_answers where attempt_id = $1 and is_correct = false`,
      [exam.id],
    )
    const wrong = new Set(rows.map((r) => r.question_id))
    const responses = (exam.responses || {}) as ExamResponses
    // Missed = answered wrongly, or left unanswered.
    const missed = (exam.question_ids || []).filter((id) => wrong.has(id) || !responses[String(id)]?.c)
    if (!missed.length) return fail('No missed questions in that exam.')
    const attemptId = await createAttempt(req.payload, {
      studentId: sid,
      certificationId: certId,
      mode: 'practice',
      domainFilter: 'Missed questions',
      questionIds: missed,
      deadline: null,
    })
    return json({ attemptId })
  }

  // Answers given as a guest before signing up are kept: graded again here
  // and recorded as the start of the new session.
  const guestIds = new Set(await guestQuestionIds(req.payload, certId))
  const claim = (Array.isArray(data.claim) ? data.claim : [])
    .slice(0, guestIds.size)
    .map((c) => ({ questionId: asInt((c as Json)?.questionId), chosen: (c as Json)?.choice }))
    .filter((c): c is { questionId: number; chosen: Letter } => Boolean(c.questionId && guestIds.has(c.questionId) && isLetter(c.chosen)))
  const claimedIds = Array.from(new Set(claim.map((c) => c.questionId)))

  const remaining = count === 0 ? 0 : Math.max(count - claimedIds.length, 0)
  const picked =
    count !== 0 && remaining === 0 ? [] : await pickPracticeQuestions(req.payload, certId, domain, remaining, claimedIds)
  const questionIds = [...claimedIds, ...picked]
  if (!questionIds.length) return fail('This certification has no questions yet.')

  const keys = await correctAnswers(req.payload, claimedIds)
  const responses: PracticeResponses = {}
  const recorded = claim
    .filter((c, i, all) => all.findIndex((x) => x.questionId === c.questionId) === i)
    .map((c) => {
      const row = keys.get(c.questionId)!
      const ok = c.chosen === row.correct_answer
      responses[String(c.questionId)] = { c: c.chosen, ok }
      return { questionId: c.questionId, certificationId: certId, domain: row.domain_name, chosen: c.chosen, isCorrect: ok }
    })

  const attemptId = await createAttempt(req.payload, {
    studentId: sid,
    certificationId: certId,
    mode: 'practice',
    domainFilter: domain,
    questionIds,
    deadline: null,
    responses,
  })
  if (recorded.length) {
    await withTransaction(req.payload, async (client) => {
      await recordAnswers(client, sid, attemptId, recorded)
      await client.query(`update attempts set correct_count = $2, current_index = $3 where id = $1`, [
        attemptId,
        recorded.filter((r) => r.isCorrect).length,
        recorded.length,
      ])
    })
  }
  return json({ attemptId })
})

const practiceQuestion = endpoint('/quiz/practice/question', async (req) => {
  const data = await body(req)
  const scope = await practiceScope(req, data)
  if (scope.error) return scope.error
  const qid = asInt(data.questionId)
  if (!qid || !scope.allowed.has(qid)) return fail('Question not available.', 403)

  const [question] = await publicQuestions(req.payload, [qid], scope.cert)
  if (!question) return fail('Question not found.', 404)

  // Already answered in this session: send the feedback too, so a refresh resumes.
  const prior = scope.attempt ? ((scope.attempt.responses || {}) as PracticeResponses)[String(qid)] : undefined
  const feedback = prior ? (await feedbackFor(req.payload, [{ questionId: qid, chosen: prior.c }])).get(qid) : undefined

  let bookmarked = false
  if (scope.sid) {
    const { rowCount } = await pool(req.payload).query(`select 1 from bookmarks where student_id = $1 and question_id = $2`, [
      scope.sid,
      qid,
    ])
    bookmarked = Boolean(rowCount)
  }
  return json({ question, feedback: feedback ?? null, bookmarked })
})

const practiceAnswer = endpoint('/quiz/practice/answer', async (req) => {
  const data = await body(req)
  const scope = await practiceScope(req, data)
  if (scope.error) return scope.error
  const qid = asInt(data.questionId)
  if (!qid || !scope.allowed.has(qid)) return fail('Question not available.', 403)
  if (!isLetter(data.choice)) return fail('Pick A, B, C or D.')
  const chosen = data.choice

  // An answer can't be changed once given in a session.
  const responses = (scope.attempt?.responses || {}) as PracticeResponses
  const prior = responses[String(qid)]
  const fb = (await feedbackFor(req.payload, [{ questionId: qid, chosen: prior?.c ?? chosen }])).get(qid)
  if (!fb) return fail('Question not found.', 404)

  if (scope.attempt && scope.sid && !prior) {
    const attempt = scope.attempt
    const sid = scope.sid
    const [q] = await publicQuestions(req.payload, [qid], scope.cert)
    await withTransaction(req.payload, async (client) => {
      const updated = await client.query(
        `update attempts set responses = coalesce(responses, '{}'::jsonb) || jsonb_build_object($2::text, $3::jsonb),
           correct_count = coalesce(correct_count, 0) + $4, current_index = coalesce(current_index, 0) + 1, updated_at = now()
         where id = $1 and status = 'in-progress' and not (coalesce(responses, '{}'::jsonb) ? $2::text) returning id`,
        [attempt.id, String(qid), JSON.stringify({ c: chosen, ok: fb.isCorrect }), fb.isCorrect ? 1 : 0],
      )
      if (!updated.rowCount) return // finished session or a double click
      await recordAnswers(client, sid, attempt.id, [
        { questionId: qid, certificationId: attempt.certification_id, domain: q?.domain ?? null, chosen, isCorrect: fb.isCorrect },
      ])
    })
  }
  return json({ feedback: fb })
})

const practiceEnd = endpoint('/quiz/practice/end', async (req) => {
  const sid = studentId(req)
  if (!sid) return fail('Please log in again.', 401)
  const data = await body(req)
  const attempt = await getOwnAttempt(req.payload, asInt(data.attemptId) ?? 0, sid)
  if (!attempt || attempt.mode !== 'practice') return fail('Practice session not found.', 404)
  const responses = (attempt.responses || {}) as PracticeResponses
  const answered = Object.values(responses)
  const correct = answered.filter((r) => r.ok).length
  await pool(req.payload).query(
    `update attempts set status = 'submitted', submitted_at = now(), correct_count = $2,
       score_percent = $3, time_used_seconds = extract(epoch from now() - started_at)::int, updated_at = now()
     where id = $1 and status = 'in-progress'`,
    [attempt.id, correct, answered.length ? Math.round((correct / answered.length) * 100) : 0],
  )
  return json({ ok: true })
})

// ---------- exam ----------

const examStart = endpoint('/quiz/exam/start', async (req) => {
  const sid = studentId(req)
  if (!sid) return fail('Please log in to take an exam simulation.', 401)
  const data = await body(req)
  const slug = asString(data.certSlug)
  const cert = slug ? await getPublishedCertification(req.payload, slug) : null
  if (!cert) return fail('Certification not found.', 404)

  // Resume an unfinished exam instead of starting a second one.
  const { rows } = await pool(req.payload).query<{ id: number }>(
    `select id from attempts where student_id = $1 and certification_id = $2 and mode = 'exam' and status = 'in-progress'
       and (deadline is null or deadline > now() - interval '30 seconds')
     order by started_at desc limit 1`,
    [sid, cert.id],
  )
  if (rows[0]) return json({ attemptId: rows[0].id, resumed: true })

  const questionIds = await pickExamQuestions(req.payload, cert)
  if (!questionIds.length) return fail('This certification has no questions yet.')
  const minutes = cert.durationMinutes || Math.max(questionIds.length, 10)
  const attemptId = await createAttempt(req.payload, {
    studentId: sid,
    certificationId: Number(cert.id),
    mode: 'exam',
    domainFilter: null,
    questionIds,
    deadline: new Date(Date.now() + minutes * 60_000),
  })
  return json({ attemptId, resumed: false })
})

// Keeps only well-formed entries for questions that are in the attempt.
function cleanResponses(input: unknown, allowed: Set<number>): ExamResponses {
  const out: ExamResponses = {}
  if (!input || typeof input !== 'object') return out
  for (const [key, raw] of Object.entries(input as Record<string, unknown>)) {
    const id = Number(key)
    if (!allowed.has(id) || !raw || typeof raw !== 'object') continue
    const r = raw as Record<string, unknown>
    const entry: ExamResponse = {}
    if (isLetter(r.c)) entry.c = r.c
    if (Array.isArray(r.x)) entry.x = LETTERS.filter((l) => (r.x as unknown[]).includes(l) && l !== entry.c)
    if (r.b === true) entry.b = true
    if (typeof r.t === 'number' && r.t > 0) entry.t = Math.min(Math.round(r.t), 6 * 60 * 60 * 1000)
    if (Object.keys(entry).length) out[key] = entry
  }
  return out
}

async function examScope(req: PayloadRequest, data: Json) {
  const sid = studentId(req)
  if (!sid) return { error: fail('Please log in again.', 401) }
  const attempt = await getOwnAttempt(req.payload, asInt(data.attemptId) ?? 0, sid)
  if (!attempt || attempt.mode !== 'exam') return { error: fail('Exam not found.', 404) }
  return { sid, attempt }
}

const examSave = endpoint('/quiz/exam/save', async (req) => {
  const data = await body(req)
  const scope = await examScope(req, data)
  if (scope.error) return scope.error
  const { attempt } = scope
  if (attempt.status !== 'in-progress') return json({ ok: true, submitted: true })
  if (attempt.deadline && Date.now() > new Date(attempt.deadline).getTime() + DEADLINE_GRACE_MS) {
    return json({ ok: false, expired: true })
  }
  const responses = cleanResponses(data.responses, new Set(attempt.question_ids || []))
  const index = Math.min(Math.max(Number(data.currentIndex) || 0, 0), (attempt.question_ids || []).length - 1)
  await pool(req.payload).query(
    `update attempts set responses = $2, current_index = $3, updated_at = now() where id = $1 and status = 'in-progress'`,
    [attempt.id, JSON.stringify(responses), index],
  )
  return json({ ok: true })
})

const examSubmit = endpoint('/quiz/exam/submit', async (req) => {
  const data = await body(req)
  const scope = await examScope(req, data)
  if (scope.error) return scope.error
  let { attempt } = scope
  const cert = await getPublishedCertificationById(req.payload, attempt.certification_id)
  if (!cert) return fail('Certification not found.', 404)

  if (attempt.status === 'in-progress') {
    // Answers sent after the deadline (plus a short grace) are ignored; the
    // last saved progress is graded instead.
    const onTime = !attempt.deadline || Date.now() <= new Date(attempt.deadline).getTime() + DEADLINE_GRACE_MS
    if (onTime && data.responses) {
      const responses = cleanResponses(data.responses, new Set(attempt.question_ids || []))
      await pool(req.payload).query(`update attempts set responses = $2 where id = $1 and status = 'in-progress'`, [
        attempt.id,
        JSON.stringify(responses),
      ])
      attempt = { ...attempt, responses }
    }
    await gradeExam(req.payload, attempt, cert)
  }
  return json({ url: `/certifications/${cert.slug}/results/${attempt.id}` })
})

// ---------- bookmarks and problem reports ----------

const bookmark = endpoint('/quiz/bookmark', async (req) => {
  const sid = studentId(req)
  if (!sid) return fail('Log in to bookmark questions.', 401)
  const data = await body(req)
  const qid = asInt(data.questionId)
  if (!qid) return fail('Missing question.')
  const { rows } = await pool(req.payload).query<{ certification_id: number }>(
    `select q.certification_id from questions q join certifications c on c.id = q.certification_id
     where q.id = $1 and c._status = 'published'`,
    [qid],
  )
  if (!rows[0]) return fail('Question not found.', 404)
  if (data.on === true) {
    // Only questions this student has been given in one of their sessions,
    // so bookmarks can't be used to reach unseen answers.
    const seen = await pool(req.payload).query(
      `select 1 from attempts where student_id = $1 and question_ids @> $2::jsonb limit 1`,
      [sid, JSON.stringify([qid])],
    )
    if (!seen.rowCount) return fail('You can only bookmark questions from your sessions.', 403)
    await pool(req.payload).query(
      `insert into bookmarks (student_id, question_id, certification_id, updated_at, created_at)
       values ($1, $2, $3, now(), now()) on conflict (student_id, question_id) do nothing`,
      [sid, qid, rows[0].certification_id],
    )
    return json({ bookmarked: true })
  }
  await pool(req.payload).query(`delete from bookmarks where student_id = $1 and question_id = $2`, [sid, qid])
  return json({ bookmarked: false })
})

const report = endpoint('/quiz/report', async (req) => {
  const sid = studentId(req)
  if (!sid) return fail('Log in to report a problem.', 401)
  const data = await body(req)
  const qid = asInt(data.questionId)
  const message = typeof data.message === 'string' ? data.message.trim() : ''
  if (!qid) return fail('Missing question.')
  if (message.length < 5 || message.length > 2000) return fail('Please describe the problem (5 to 2000 characters).')
  // At most 20 reports a day per student, to keep the inbox usable.
  const { rows } = await pool(req.payload).query<{ n: number }>(
    `select count(*)::int as n from problem_reports where student_id = $1 and created_at > now() - interval '1 day'`,
    [sid],
  )
  if (rows[0].n >= 20) return fail('You have sent a lot of reports today. Please try again tomorrow.', 429)
  await req.payload.create({
    collection: 'problem-reports',
    data: { question: qid, student: sid, message, status: 'open' },
    overrideAccess: true,
  })
  return json({ ok: true })
})

export const quizEndpoints: Endpoint[] = [
  practiceStart,
  practiceQuestion,
  practiceAnswer,
  practiceEnd,
  examStart,
  examSave,
  examSubmit,
  bookmark,
  report,
]
