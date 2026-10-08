import type { CollectionConfig } from 'payload'

import { adminOnly, adminOnlyField, adminOrOwn, isAdminUser, isStudentUser } from '../access/roles'

// Everything a student does is written by the server (quiz endpoints run with
// overrideAccess after their own checks), so students can read their own rows
// but can never create or edit scores, answers or statistics directly.

const studentField = {
  name: 'student',
  type: 'relationship',
  relationTo: 'students',
  required: true,
  index: true,
} as const

const certificationField = {
  name: 'certification',
  type: 'relationship',
  relationTo: 'certifications',
  index: true,
} as const

const answerLetter = { type: 'select' as const, options: ['A', 'B', 'C', 'D'] }

export const Attempts: CollectionConfig = {
  slug: 'attempts',
  labels: { singular: 'Attempt', plural: 'Attempts' },
  access: {
    create: adminOnly,
    read: adminOrOwn(),
    update: adminOnly,
    delete: adminOnly,
  },
  admin: {
    group: 'Students',
    defaultColumns: ['student', 'certification', 'mode', 'status', 'scorePercent', 'startedAt'],
  },
  indexes: [{ fields: ['student', 'certification'] }],
  fields: [
    studentField,
    { ...certificationField, required: true },
    {
      name: 'mode',
      type: 'select',
      required: true,
      options: [
        { label: 'Practice', value: 'practice' },
        { label: 'Exam simulation', value: 'exam' },
      ],
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'in-progress',
      index: true,
      options: [
        { label: 'In progress', value: 'in-progress' },
        { label: 'Submitted', value: 'submitted' },
        { label: 'Abandoned', value: 'abandoned' },
      ],
    },
    { name: 'domainFilter', type: 'text', admin: { description: 'Practice: the chosen domain, if any.' } },
    { name: 'questionIds', type: 'json', admin: { description: 'Question IDs in the order shown.' } },
    { name: 'responses', type: 'json', admin: { description: 'Saved answers, cross-outs and bookmarks so a refresh can resume.' } },
    { name: 'currentIndex', type: 'number', defaultValue: 0 },
    { name: 'startedAt', type: 'date', required: true },
    { name: 'deadline', type: 'date', admin: { description: 'Exam simulation: when time runs out.' } },
    { name: 'submittedAt', type: 'date' },
    { name: 'timeUsedSeconds', type: 'number' },
    { name: 'totalQuestions', type: 'number' },
    { name: 'correctCount', type: 'number' },
    { name: 'scorePercent', type: 'number' },
    { name: 'passed', type: 'checkbox' },
    { name: 'domainResults', type: 'json' },
  ],
  timestamps: true,
}

export const AttemptAnswers: CollectionConfig = {
  slug: 'attempt-answers',
  labels: { singular: 'Answer', plural: 'Answers' },
  access: {
    create: adminOnly,
    read: adminOrOwn(),
    update: adminOnly,
    delete: adminOnly,
  },
  admin: {
    group: 'Students',
    defaultColumns: ['student', 'question', 'chosen', 'isCorrect', 'answeredAt'],
  },
  // Mastery = "correct the last 2 times" per question, looked up per student.
  indexes: [{ fields: ['student', 'question'] }, { fields: ['student', 'certification'] }],
  fields: [
    { name: 'attempt', type: 'relationship', relationTo: 'attempts', index: true },
    studentField,
    { name: 'question', type: 'relationship', relationTo: 'questions', required: true },
    certificationField,
    { name: 'domainName', type: 'text' },
    { name: 'chosen', ...answerLetter },
    { name: 'isCorrect', type: 'checkbox', defaultValue: false },
    { name: 'answeredAt', type: 'date', required: true },
  ],
}

export const Bookmarks: CollectionConfig = {
  slug: 'bookmarks',
  labels: { singular: 'Bookmark', plural: 'Bookmarks' },
  access: {
    // Students bookmark through /api/quiz/bookmark, which only allows
    // questions they have actually been given in a session.
    create: adminOnly,
    read: adminOrOwn(),
    update: adminOnly,
    delete: adminOrOwn(),
  },
  admin: {
    group: 'Students',
    defaultColumns: ['student', 'question', 'certification', 'createdAt'],
  },
  indexes: [{ fields: ['student', 'question'], unique: true }],
  fields: [
    { ...studentField, access: { update: adminOnlyField } },
    { name: 'question', type: 'relationship', relationTo: 'questions', required: true },
    certificationField,
  ],
  hooks: {
    beforeChange: [
      async ({ data, req, operation }) => {
        // A student can only ever bookmark for themselves.
        if (operation === 'create' && isStudentUser(req) && req.user) {
          data.student = req.user.id
        }
        // Certification is copied from the question so bookmarks can be filtered by it.
        const questionId = typeof data.question === 'object' ? data.question?.id : data.question
        if (questionId) {
          const question = await req.payload.findByID({
            collection: 'questions',
            id: questionId,
            depth: 0,
            req,
            overrideAccess: true,
            select: { certification: true },
          })
          data.certification =
            typeof question.certification === 'object'
              ? question.certification.id
              : question.certification
        }
        return data
      },
    ],
  },
  timestamps: true,
}

export const AnswerStats: CollectionConfig = {
  slug: 'answer-stats',
  labels: { singular: 'Answer statistic', plural: 'Answer statistics' },
  access: {
    create: adminOnly,
    read: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
  admin: {
    group: 'Students',
    defaultColumns: ['question', 'total', 'countA', 'countB', 'countC', 'countD'],
  },
  fields: [
    {
      name: 'question',
      type: 'relationship',
      relationTo: 'questions',
      required: true,
      unique: true,
    },
    { name: 'countA', type: 'number', defaultValue: 0 },
    { name: 'countB', type: 'number', defaultValue: 0 },
    { name: 'countC', type: 'number', defaultValue: 0 },
    { name: 'countD', type: 'number', defaultValue: 0 },
    { name: 'total', type: 'number', defaultValue: 0 },
  ],
}

export const ProblemReports: CollectionConfig = {
  slug: 'problem-reports',
  labels: { singular: 'Problem report', plural: 'Problem reports' },
  access: {
    create: ({ req }) => isAdminUser(req) || isStudentUser(req),
    read: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
  admin: {
    group: 'Students',
    defaultColumns: ['question', 'status', 'student', 'createdAt'],
  },
  fields: [
    { name: 'question', type: 'relationship', relationTo: 'questions', required: true },
    { name: 'student', type: 'relationship', relationTo: 'students', access: { update: adminOnlyField } },
    { name: 'message', type: 'textarea', required: true, maxLength: 2000 },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'open',
      index: true,
      access: { create: adminOnlyField, update: adminOnlyField },
      options: [
        { label: 'Open', value: 'open' },
        { label: 'Reviewing', value: 'reviewing' },
        { label: 'Fixed', value: 'fixed' },
        { label: 'Not a problem', value: 'rejected' },
      ],
    },
  ],
  hooks: {
    beforeChange: [
      ({ data, req, operation }) => {
        if (operation === 'create' && isStudentUser(req) && req.user) {
          data.student = req.user.id
        }
        return data
      },
    ],
  },
  timestamps: true,
}
