import type { Payload } from 'payload'

import type { Student } from '@/payload-types'
import { pool } from './server'
import type { DomainResult } from './types'

// Student progress figures shown on the quiz start and results screens.

export type HeaderStats = {
  initials: string
  streak: number
  dailyGoal: number
  answeredToday: number
}

export async function headerStats(payload: Payload, student: Student): Promise<HeaderStats> {
  const { rows } = await pool(payload).query<{ today: number; streak: number }>(
    `select
       (select count(*)::int from attempt_answers where student_id = $1 and answered_at >= current_date) as today,
       (select case when last_active_date::date >= current_date - 1 then coalesce(current_streak, 0) else 0 end
          from students where id = $1) as streak`,
    [student.id],
  )
  const source = (student.name || student.email || '?').trim()
  const parts = source.split(/[\s@._-]+/).filter(Boolean)
  const initials = ((parts[0]?.[0] || '?') + (parts[1]?.[0] || '')).toUpperCase()
  return {
    initials,
    streak: Number(rows[0]?.streak ?? 0),
    dailyGoal: Number(student.dailyGoal) || 25,
    answeredToday: rows[0]?.today ?? 0,
  }
}

export type ExamSummary = {
  id: number
  score: number
  passed: boolean
  submittedAt: string
  domainResults: Record<string, DomainResult>
}

// Most recent submitted exam simulations for a certification, newest first.
export async function examHistory(payload: Payload, studentId: number, certId: number, limit = 5): Promise<ExamSummary[]> {
  const { rows } = await pool(payload).query<{
    id: number
    score_percent: number
    passed: boolean
    submitted_at: Date
    domain_results: Record<string, DomainResult> | null
  }>(
    `select id, score_percent, passed, submitted_at, domain_results from attempts
     where student_id = $1 and certification_id = $2 and mode = 'exam' and status = 'submitted'
     order by submitted_at desc limit $3`,
    [studentId, certId, limit],
  )
  return rows.map((r) => ({
    id: r.id,
    score: Number(r.score_percent ?? 0),
    passed: Boolean(r.passed),
    submittedAt: new Date(r.submitted_at).toISOString(),
    domainResults: r.domain_results || {},
  }))
}

// Readiness = average of the last 3 exam simulations.
export function readinessFrom(history: ExamSummary[]): { score: number | null; change: number | null } {
  if (!history.length) return { score: null, change: null }
  const last3 = history.slice(0, 3)
  const score = Math.round(last3.reduce((s, h) => s + h.score, 0) / last3.length)
  const change = history.length > 1 ? history[0].score - history[1].score : null
  return { score, change }
}

// Mastered = the student's last two answers to a question were both correct.
export async function masteryByDomain(payload: Payload, studentId: number, certId: number): Promise<Map<string, number>> {
  const { rows } = await pool(payload).query<{ domain_name: string; mastered: number }>(
    `with ranked as (
       select question_id, is_correct,
              row_number() over (partition by question_id order by answered_at desc, id desc) as rn
       from attempt_answers where student_id = $1 and certification_id = $2
     ), last_two as (
       select question_id from ranked where rn <= 2
       group by question_id having count(*) = 2 and bool_and(is_correct)
     )
     select q.domain_name, count(*)::int as mastered
     from last_two m join questions q on q.id = m.question_id
     group by q.domain_name`,
    [studentId, certId],
  )
  return new Map(rows.map((r) => [r.domain_name, r.mastered]))
}

// Certifications the student has practised or taken exams in, most recent first.
export async function activeCertificationIds(payload: Payload, studentId: number): Promise<number[]> {
  const { rows } = await pool(payload).query<{ certification_id: number }>(
    `select certification_id from attempts where student_id = $1
     group by certification_id order by max(started_at) desc`,
    [studentId],
  )
  return rows.map((r) => r.certification_id)
}

export type ExamHistoryRow = {
  id: number
  certificationId: number
  score: number
  passed: boolean
  submittedAt: string
  timeUsedSeconds: number
  totalQuestions: number
}

// All submitted exam simulations, newest first.
export async function allExamHistory(payload: Payload, studentId: number, limit = 20, offset = 0) {
  const { rows } = await pool(payload).query<{
    id: number
    certification_id: number
    score_percent: number
    passed: boolean
    submitted_at: Date
    time_used_seconds: number
    total_questions: number
    total: number
  }>(
    `select id, certification_id, score_percent, passed, submitted_at, time_used_seconds, total_questions,
            count(*) over ()::int as total
     from attempts where student_id = $1 and mode = 'exam' and status = 'submitted'
     order by submitted_at desc limit $2 offset $3`,
    [studentId, limit, offset],
  )
  return {
    total: rows[0]?.total ?? 0,
    rows: rows.map(
      (r): ExamHistoryRow => ({
        id: r.id,
        certificationId: r.certification_id,
        score: Number(r.score_percent ?? 0),
        passed: Boolean(r.passed),
        submittedAt: new Date(r.submitted_at).toISOString(),
        timeUsedSeconds: Number(r.time_used_seconds ?? 0),
        totalQuestions: Number(r.total_questions ?? 0),
      }),
    ),
  }
}

export async function practiceTotals(payload: Payload, studentId: number) {
  const { rows } = await pool(payload).query<{ answered: number; correct: number }>(
    `select count(*)::int as answered, count(*) filter (where is_correct)::int as correct
     from attempt_answers where student_id = $1`,
    [studentId],
  )
  return rows[0] ?? { answered: 0, correct: 0 }
}

// Questions in an unfinished exam: their answers must not be shown anywhere yet.
export async function questionsInOpenExams(payload: Payload, studentId: number): Promise<Set<number>> {
  const { rows } = await pool(payload).query<{ id: number }>(
    `select distinct (jsonb_array_elements_text(question_ids))::int as id from attempts
     where student_id = $1 and mode = 'exam' and status = 'in-progress'`,
    [studentId],
  )
  return new Set(rows.map((r) => r.id))
}

export type DomainProgress = { practised: number; correct: number }

// Per domain: how many different questions the student has tried, and how many
// of those they got right the last time they answered them.
export async function progressByDomain(
  payload: Payload,
  studentId: number,
  certId: number,
): Promise<Map<string, DomainProgress>> {
  const { rows } = await pool(payload).query<{ domain_name: string; practised: number; correct: number }>(
    `with latest as (
       select distinct on (question_id) question_id, is_correct
       from attempt_answers where student_id = $1 and certification_id = $2
       order by question_id, answered_at desc, id desc
     )
     select q.domain_name, count(*)::int as practised, count(*) filter (where l.is_correct)::int as correct
     from latest l join questions q on q.id = l.question_id
     group by q.domain_name`,
    [studentId, certId],
  )
  return new Map(rows.map((r) => [r.domain_name, { practised: r.practised, correct: r.correct }]))
}

export type ActivityRow = {
  id: number
  mode: 'practice' | 'exam'
  status: 'in-progress' | 'submitted' | 'abandoned'
  certificationId: number
  label: string | null
  total: number
  answered: number
  correct: number
  score: number | null
  passed: boolean | null
  timeUsedSeconds: number | null
  date: string
}

// Everything the student has done - practice sessions and exam simulations - newest first.
export async function activityHistory(payload: Payload, studentId: number, limit = 10, offset = 0) {
  const { rows } = await pool(payload).query<{
    id: number
    mode: 'practice' | 'exam'
    status: 'in-progress' | 'submitted' | 'abandoned'
    certification_id: number
    domain_filter: string | null
    total: number
    answered: number
    correct: number
    score_percent: string | null
    passed: boolean | null
    time_used_seconds: string | null
    at: Date
    total_rows: number
  }>(
    `select a.id, a.mode, a.status, a.certification_id, a.domain_filter,
            jsonb_array_length(coalesce(a.question_ids, '[]'::jsonb))::int as total,
            (select count(*)::int from attempt_answers x where x.attempt_id = a.id) as answered,
            (select count(*)::int from attempt_answers x where x.attempt_id = a.id and x.is_correct) as correct,
            a.score_percent, a.passed, a.time_used_seconds,
            coalesce(a.submitted_at, a.started_at) as at,
            count(*) over ()::int as total_rows
     from attempts a
     where a.student_id = $1
       and (a.mode = 'exam' or exists (select 1 from attempt_answers x where x.attempt_id = a.id))
     order by coalesce(a.submitted_at, a.started_at) desc limit $2 offset $3`,
    [studentId, limit, offset],
  )
  return {
    total: rows[0]?.total_rows ?? 0,
    rows: rows.map(
      (r): ActivityRow => ({
        id: r.id,
        mode: r.mode,
        status: r.status,
        certificationId: r.certification_id,
        label: r.domain_filter,
        total: r.total,
        answered: r.answered,
        correct: r.correct,
        score: r.mode === 'exam' ? (r.score_percent === null ? null : Number(r.score_percent)) : r.answered ? Math.round((r.correct / r.answered) * 100) : null,
        passed: r.passed,
        timeUsedSeconds: r.time_used_seconds === null ? null : Number(r.time_used_seconds),
        date: new Date(r.at).toISOString(),
      }),
    ),
  }
}

export async function unfinishedExam(
  payload: Payload,
  studentId: number,
  certId: number,
): Promise<{ id: number; deadline: string } | null> {
  const { rows } = await pool(payload).query<{ id: number; deadline: Date }>(
    `select id, deadline from attempts
     where student_id = $1 and certification_id = $2 and mode = 'exam' and status = 'in-progress' and deadline > now()
     order by started_at desc limit 1`,
    [studentId, certId],
  )
  return rows[0] ? { id: rows[0].id, deadline: new Date(rows[0].deadline).toISOString() } : null
}
