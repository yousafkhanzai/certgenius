// Shapes shared by the quiz server code and the quiz screens. Nothing here may
// carry an answer key: PublicQuestion is all a browser sees before answering.

export const LETTERS = ['A', 'B', 'C', 'D'] as const
export type Letter = (typeof LETTERS)[number]

export const isLetter = (v: unknown): v is Letter =>
  typeof v === 'string' && (LETTERS as readonly string[]).includes(v)

export type StudyGuide = { title: string; url: string; domainQuestionCount: number }

export type PublicQuestion = {
  id: number
  text: string
  options: { letter: Letter; text: string }[]
  domain: string
  level: 'easy' | 'medium' | 'hard' | null
  hint: string | null
  studyGuide: StudyGuide | null
}

// Returned only after the student has committed to an answer.
export type Feedback = {
  questionId: number
  chosen: Letter
  correct: Letter
  isCorrect: boolean
  explanation: string | null
  why: Partial<Record<Letter, string>>
  remember: string | null
  referenceUrl: string | null
  // Share of students who chose each option; null until 30+ answers.
  stats: Record<Letter, number> | null
}

// Saved exam progress, keyed by question id.
export type ExamResponse = {
  c?: Letter // chosen answer
  x?: Letter[] // crossed-out options
  b?: boolean // bookmarked during this attempt
  t?: number // milliseconds spent on the question
}
export type ExamResponses = Record<string, ExamResponse>

// Saved practice progress, keyed by question id.
export type PracticeResponse = { c: Letter; ok: boolean }
export type PracticeResponses = Record<string, PracticeResponse>

export type DomainResult = { correct: number; total: number }

export const PRACTICE_COUNTS = [10, 25, 50, 0] as const // 0 = All
export const GUEST_FREE_QUESTIONS = 10
export const STATS_MIN_ANSWERS = 30
