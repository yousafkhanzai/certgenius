import type { Payload } from 'payload'

import { CERT_CATEGORIES, CERT_STATUSES } from '@/collections/Certifications/options'
import { pool } from '@/quiz/server'

// Read-only numbers for the admin tools (health board, stats, reports inbox).
// Nothing here changes data.

// ---------- certification health board ----------

export type DomainHealth = {
  name: string
  weight: number | null
  questions: number
  guide: { id: number; title: string; published: boolean } | null
}

export type CertHealth = {
  id: number
  title: string
  slug: string | null
  vendor: string | null
  category: string | null
  examStatus: string | null
  published: boolean
  updatedAt: string
  domains: DomainHealth[]
  totalQuestions: number
  // Questions whose domain name matches none of this certification's domains.
  strayQuestions: number
  blockers: string[] // stop publishing (HARD RULE)
  tips: string[] // recommended, but do not stop publishing
}

export async function certificationHealth(payload: Payload): Promise<CertHealth[]> {
  const db = pool(payload)
  const [certs, questionRows] = await Promise.all([
    // draft: true returns each certification's latest saved version.
    payload.find({ collection: 'certifications', draft: true, depth: 0, limit: 0, pagination: false, overrideAccess: true, sort: 'title' }),
    db.query<{ certification_id: number; domain_name: string | null; n: number }>(
      `select certification_id, domain_name, count(*)::int as n from questions
       where option_a is not null and correct_answer is not null group by certification_id, domain_name`,
    ),
  ])
  // Which certifications are live right now (the published copy, not the latest draft).
  const liveRows = await db.query<{ id: number }>(`select id from certifications where _status = 'published'`)
  const live = new Set(liveRows.rows.map((r) => r.id))

  const guideIds = certs.docs.flatMap((c) =>
    (c.domains || []).map((d) => (typeof d.studyGuide === 'object' ? d.studyGuide?.id : d.studyGuide)).filter((id): id is number => typeof id === 'number'),
  )
  const guides = new Map<number, { title: string; published: boolean }>()
  if (guideIds.length) {
    const { rows } = await db.query<{ id: number; title: string; _status: string }>(
      `select id, title, _status from posts where id = any($1::int[])`,
      [guideIds],
    )
    for (const r of rows) guides.set(r.id, { title: r.title, published: r._status === 'published' })
  }

  return certs.docs.map((c) => {
    const id = Number(c.id)
    const counts = new Map<string, number>()
    for (const r of questionRows.rows) if (r.certification_id === id) counts.set(r.domain_name || '', r.n)

    const domains: DomainHealth[] = (c.domains || []).map((d) => {
      const guideId = typeof d.studyGuide === 'object' ? d.studyGuide?.id : d.studyGuide
      const guide = typeof guideId === 'number' ? guides.get(guideId) : undefined
      return {
        name: d.name,
        weight: d.weight ?? null,
        questions: counts.get(d.name) || 0,
        guide: guide && typeof guideId === 'number' ? { id: guideId, ...guide } : null,
      }
    })
    const names = new Set(domains.map((d) => d.name))
    const totalQuestions = [...counts.values()].reduce((s, n) => s + n, 0)
    const strayQuestions = [...counts.entries()].filter(([name]) => !names.has(name)).reduce((s, [, n]) => s + n, 0)

    const blockers: string[] = []
    if (!domains.length) blockers.push('Add the exam domains (Domains tab).')
    for (const d of domains) {
      if (!d.questions) blockers.push(`"${d.name}" has no questions.`)
      if (!d.guide) blockers.push(`"${d.name}" has no blog attached.`)
      else if (!d.guide.published) blockers.push(`The blog for "${d.name}" is not published.`)
    }

    const tips: string[] = []
    if (!c.summary) tips.push('Add a short description (shown on the certification card).')
    if (!c.certCategory) tips.push('Choose a category.')
    if (!c.vendor) tips.push('Add the vendor.')
    if (!c.examQuestionCount || !c.durationMinutes || !c.passingScore) {
      tips.push('Fill in the exam facts (questions, time, pass score) - the exam simulation uses them.')
    }
    const weights = domains.map((d) => d.weight || 0)
    const weightSum = weights.reduce((s, w) => s + w, 0)
    if (domains.length && weightSum !== 100) tips.push(`Domain weights add up to ${weightSum}%, not 100%.`)
    if (strayQuestions) tips.push(`${strayQuestions} question(s) use a domain name that is not on this certification, so they never appear.`)

    return {
      id,
      title: c.title?.trim() || `Untitled draft #${id}`,
      slug: c.slug ?? null,
      vendor: c.vendor ?? null,
      category: CERT_CATEGORIES.find((x) => x.value === c.certCategory)?.label ?? null,
      examStatus: CERT_STATUSES.find((x) => x.value === c.examStatus)?.label ?? null,
      published: live.has(id),
      updatedAt: c.updatedAt,
      domains,
      totalQuestions,
      strayQuestions,
      blockers,
      tips,
    }
  })
}

// ---------- site stats ----------

const one = async <T extends Record<string, unknown>>(payload: Payload, sql: string, params: unknown[] = []) =>
  (await pool(payload).query<T>(sql, params)).rows[0]

export async function siteStats(payload: Payload) {
  const db = pool(payload)
  const [students, answers, attempts, content, daily, topCerts, missed, reports] = await Promise.all([
    one<{ total: number; d7: number; d30: number }>(
      payload,
      `select count(*)::int total,
              count(*) filter (where created_at > now() - interval '7 days')::int d7,
              count(*) filter (where created_at > now() - interval '30 days')::int d30
       from students`,
    ),
    one<{ total: number; today: number; d7: number; correct7: number; active7: number }>(
      payload,
      `select count(*)::int total,
              count(*) filter (where answered_at >= date_trunc('day', now()))::int today,
              count(*) filter (where answered_at > now() - interval '7 days')::int d7,
              count(*) filter (where answered_at > now() - interval '7 days' and is_correct)::int correct7,
              count(distinct student_id) filter (where answered_at > now() - interval '7 days')::int active7
       from attempt_answers`,
    ),
    one<{ practice7: number; exams: number; exams7: number; passed: number; avg_score: number | null }>(
      payload,
      `select count(*) filter (where mode = 'practice' and started_at > now() - interval '7 days')::int practice7,
              count(*) filter (where mode = 'exam' and status = 'submitted')::int exams,
              count(*) filter (where mode = 'exam' and status = 'submitted' and submitted_at > now() - interval '7 days')::int exams7,
              count(*) filter (where mode = 'exam' and status = 'submitted' and passed)::int passed,
              round(avg(score_percent) filter (where mode = 'exam' and status = 'submitted'))::int avg_score
       from attempts`,
    ),
    one<{ certs_live: number; certs_draft: number; questions: number; blogs: number; bookmarks: number }>(
      payload,
      `select (select count(*) from certifications where _status = 'published')::int certs_live,
              (select count(*) from certifications where _status is distinct from 'published')::int certs_draft,
              (select count(*) from questions where option_a is not null)::int questions,
              (select count(*) from posts where _status = 'published')::int blogs,
              (select count(*) from bookmarks)::int bookmarks`,
    ),
    db.query<{ day: string; n: number }>(
      `select to_char(d, 'YYYY-MM-DD') as day, count(a.id)::int as n
       from generate_series(date_trunc('day', now()) - interval '13 days', date_trunc('day', now()), interval '1 day') d
       left join attempt_answers a on a.answered_at >= d and a.answered_at < d + interval '1 day'
       group by d order by d`,
    ),
    db.query<{ id: number; title: string; n: number }>(
      `select c.id, c.title, count(*)::int n from attempt_answers a join certifications c on c.id = a.certification_id
       where a.answered_at > now() - interval '30 days' group by c.id, c.title order by n desc limit 5`,
    ),
    // Questions most students get wrong (at least 5 answers) - worth checking.
    db.query<{ id: number; text: string; cert: string | null; domain: string | null; answers: number; wrong_pct: number }>(
      `select q.id, left(q.question_text, 160) as text, c.title as cert, q.domain_name as domain,
              count(*)::int answers, round(100.0 * count(*) filter (where not a.is_correct) / count(*))::int wrong_pct
       from attempt_answers a join questions q on q.id = a.question_id left join certifications c on c.id = q.certification_id
       group by q.id, c.title having count(*) >= 5 order by wrong_pct desc, answers desc limit 10`,
    ),
    one<{ open: number }>(payload, `select count(*)::int open from problem_reports where status in ('open', 'reviewing') or status is null`),
  ])
  return { students, answers, attempts, content, daily: daily.rows, topCerts: topCerts.rows, missed: missed.rows, openReports: reports.open }
}

// ---------- problem reports ----------

export const REPORT_STATUSES = [
  { value: 'open', label: 'Open' },
  { value: 'reviewing', label: 'Reviewing' },
  { value: 'fixed', label: 'Fixed' },
  { value: 'rejected', label: 'Not a problem' },
] as const
export type ReportStatus = (typeof REPORT_STATUSES)[number]['value']

export async function problemReports(payload: Payload, status: ReportStatus | 'all') {
  const db = pool(payload)
  const where = status === 'all' ? '' : status === 'open' ? `where (r.status = 'open' or r.status is null)` : `where r.status = $1`
  const { rows } = await db.query<{
    id: number
    status: string | null
    message: string
    created_at: string
    question_id: number
    question_text: string | null
    domain: string | null
    correct: string | null
    cert: string | null
    cert_slug: string | null
    student: string | null
  }>(
    `select r.id, r.status, r.message, r.created_at, r.question_id, q.question_text, q.domain_name as domain,
            q.correct_answer as correct, c.title as cert, c.slug as cert_slug, s.email as student
     from problem_reports r
     left join questions q on q.id = r.question_id
     left join certifications c on c.id = q.certification_id
     left join students s on s.id = r.student_id
     ${where} order by r.created_at desc limit 200`,
    status === 'all' || status === 'open' ? [] : [status],
  )
  const counts = await db.query<{ status: string | null; n: number }>(`select status, count(*)::int n from problem_reports group by status`)
  const count = (s: string) => counts.rows.filter((r) => (r.status || 'open') === s).reduce((t, r) => t + r.n, 0)
  return {
    reports: rows,
    counts: Object.fromEntries([...REPORT_STATUSES.map((s) => [s.value, count(s.value)]), ['all', counts.rows.reduce((t, r) => t + r.n, 0)]]),
  }
}

// ---------- students ----------

export type StudentRow = {
  id: number
  name: string | null
  email: string
  country: string | null
  city: string | null
  joined: string
  last_seen: string | null
  streak: number
  answers: number
  correct: number
  practice_sessions: number
  exams_started: number
  exams_finished: number
  exams_passed: number
  avg_exam_score: number | null
  top_cert: string | null
}

// What a student mostly does, in plain words.
export function mostlyDoing(s: Pick<StudentRow, 'practice_sessions' | 'exams_started' | 'answers'>): string {
  if (!s.practice_sessions && !s.exams_started) return s.answers ? 'Free questions only' : 'Not started yet'
  if (s.exams_started > s.practice_sessions) return 'Mostly exam simulations'
  if (s.exams_started === 0) return 'Practice only'
  return 'Mostly practice'
}

export async function studentList(payload: Payload, filters: { q?: string; country?: string; id?: number }) {
  const params: unknown[] = []
  const where: string[] = []
  if (filters.q) {
    // Search text is matched literally: % and _ are not wildcards here.
    params.push(`%${filters.q.replace(/[%_\\]/g, (m) => '\\' + m)}%`)
    where.push(`(s.email ilike $${params.length} or s.name ilike $${params.length})`)
  }
  if (filters.id) {
    params.push(filters.id)
    where.push(`s.id = $${params.length}`)
  }
  if (filters.country) {
    params.push(filters.country)
    where.push(`s.country = $${params.length}`)
  }
  const { rows } = await pool(payload).query<StudentRow>(
    `with ans as (
       select student_id, count(*)::int n, count(*) filter (where is_correct)::int c from attempt_answers group by student_id
     ), att as (
       select student_id,
              count(*) filter (where mode = 'practice')::int practice,
              count(*) filter (where mode = 'exam')::int exams,
              count(*) filter (where mode = 'exam' and status = 'submitted')::int exams_done,
              count(*) filter (where mode = 'exam' and status = 'submitted' and passed)::int exams_passed,
              round(avg(score_percent) filter (where mode = 'exam' and status = 'submitted'))::int avg_score
       from attempts group by student_id
     ), top as (
       select distinct on (aa.student_id) aa.student_id, c.title
       from attempt_answers aa join certifications c on c.id = aa.certification_id
       group by aa.student_id, c.title order by aa.student_id, count(*) desc
     )
     select s.id, s.name, s.email, s.country, s.city, s.created_at as joined,
            greatest(s.last_seen_at, s.last_active_date) as last_seen, coalesce(s.current_streak, 0)::int as streak,
            coalesce(ans.n, 0) answers, coalesce(ans.c, 0) correct,
            coalesce(att.practice, 0) practice_sessions, coalesce(att.exams, 0) exams_started,
            coalesce(att.exams_done, 0) exams_finished, coalesce(att.exams_passed, 0) exams_passed,
            att.avg_score as avg_exam_score, top.title as top_cert
     from students s
     left join ans on ans.student_id = s.id
     left join att on att.student_id = s.id
     left join top on top.student_id = s.id
     ${where.length ? `where ${where.join(' and ')}` : ''}
     order by coalesce(greatest(s.last_seen_at, s.last_active_date), s.created_at) desc
     limit 1000`,
    params,
  )
  const countries = await pool(payload).query<{ country: string | null; n: number }>(
    `select country, count(*)::int n from students group by country order by n desc`,
  )
  return { students: rows, countries: countries.rows }
}

export async function studentDetail(payload: Payload, id: number) {
  const db = pool(payload)
  const [list, perCert, recent] = await Promise.all([
    db.query<{ id: number }>(`select id from students where id = $1`, [id]),
    db.query<{
      title: string
      slug: string | null
      answers: number
      correct: number
      practice: number
      exams: number
      best_score: number | null
      last: string | null
    }>(
      `select c.title, c.slug,
              (select count(*) from attempt_answers a where a.student_id = $1 and a.certification_id = c.id)::int answers,
              (select count(*) from attempt_answers a where a.student_id = $1 and a.certification_id = c.id and a.is_correct)::int correct,
              (select count(*) from attempts t where t.student_id = $1 and t.certification_id = c.id and t.mode = 'practice')::int practice,
              (select count(*) from attempts t where t.student_id = $1 and t.certification_id = c.id and t.mode = 'exam' and t.status = 'submitted')::int exams,
              (select max(score_percent) from attempts t where t.student_id = $1 and t.certification_id = c.id and t.mode = 'exam' and t.status = 'submitted')::int best_score,
              (select max(answered_at) from attempt_answers a where a.student_id = $1 and a.certification_id = c.id) last
       from certifications c
       where c.id in (select certification_id from attempts where student_id = $1
                      union select certification_id from attempt_answers where student_id = $1)
       order by last desc nulls last`,
      [id],
    ),
    db.query<{ mode: string; status: string; title: string; started_at: string; score_percent: number | null; passed: boolean | null; total_questions: number | null }>(
      `select t.mode, t.status, c.title, t.started_at, t.score_percent, t.passed, t.total_questions
       from attempts t join certifications c on c.id = t.certification_id
       where t.student_id = $1 order by t.started_at desc limit 15`,
      [id],
    ),
  ])
  if (!list.rows.length) return null
  const [row] = (await studentList(payload, { id })).students
  return { student: row, perCert: perCert.rows, recent: recent.rows }
}
