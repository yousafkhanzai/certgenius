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
    streak: rows[0]?.streak ?? 0,
    dailyGoal: student.dailyGoal || 25,
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
    score: r.score_percent ?? 0,
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
