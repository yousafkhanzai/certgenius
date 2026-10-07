import type { CollectionConfig, FieldAccess, TextareaField, TextField } from 'payload'

import { authenticated } from '../../access/authenticated'
import { validateHttpUrl, validateLinkOrSitePath } from '../../access/roles'
import { questionImportEndpoint } from '../../import/endpoints'
import { questionHash } from './hash'

// Questions (and their answer keys) are admin-only in the public REST/GraphQL
// API so the bank can't be scraped. Pages read them on the server with
// overrideAccess and only send the browser what it needs.
const adminOnlyRead: FieldAccess = ({ req: { user } }) => user?.collection === 'users'

// New fields can't be NOT NULL in the database (existing rows would block the
// schema update), so "required" is enforced here instead.
const requiredText = (value: unknown) =>
  typeof value === 'string' && value.trim() !== '' ? true : 'This field is required.'

const optionField = (letter: 'A' | 'B' | 'C' | 'D'): TextareaField => ({
  name: `option${letter}`,
  type: 'textarea',
  label: `Option ${letter}`,
  validate: requiredText,
  admin: { rows: 2 },
})

const whyField = (letter: 'A' | 'B' | 'C' | 'D'): TextareaField => ({
  name: `why${letter}`,
  type: 'textarea',
  label: `Why ${letter} is right/wrong`,
  access: { read: adminOnlyRead },
  admin: { rows: 2 },
})

const urlField = (name: string, label: string, allowSitePath = false): TextField => ({
  name,
  type: 'text',
  label,
  validate: allowSitePath ? validateLinkOrSitePath : validateHttpUrl,
})

export const Questions: CollectionConfig = {
  slug: 'questions',
  labels: {
    singular: 'Practice Question',
    plural: 'Practice Questions',
  },
  access: {
    create: authenticated,
    delete: authenticated,
    read: authenticated,
    update: authenticated,
  },
  admin: {
    useAsTitle: 'questionText',
    defaultColumns: ['questionText', 'certification', 'domainName', 'level', 'updatedAt'],
    group: 'Certification Content',
    listSearchableFields: ['questionText', 'domainName'],
  },
  // Quizzes always load questions for one certification (and often one
  // domain) at a time - never the whole 15,000+ bank.
  indexes: [{ fields: ['certification', 'domainName'] }],
  endpoints: [questionImportEndpoint],
  fields: [
    {
      name: 'certification',
      type: 'relationship',
      relationTo: 'certifications',
      required: true,
      hasMany: false,
      index: true,
      admin: {
        description: 'Which certification is this question for?',
      },
    },
    {
      name: 'domainName',
      type: 'text',
      label: 'Domain',
      validate: requiredText,
      admin: {
        description: "Must exactly match one of the certification's domain names.",
      },
    },
    {
      name: 'questionText',
      type: 'textarea',
      required: true,
      label: 'Question',
    },
    {
      type: 'row',
      fields: [optionField('A'), optionField('B')],
    },
    {
      type: 'row',
      fields: [optionField('C'), optionField('D')],
    },
    {
      name: 'correctAnswer',
      type: 'select',
      options: ['A', 'B', 'C', 'D'],
      access: { read: adminOnlyRead },
      validate: (value: unknown) =>
        typeof value === 'string' && ['A', 'B', 'C', 'D'].includes(value)
          ? true
          : 'Pick the correct answer (A-D).',
    },
    {
      name: 'explanation',
      type: 'textarea',
      access: { read: adminOnlyRead },
      admin: {
        description: 'Shown after the student answers - why the correct answer is correct.',
      },
    },
    {
      type: 'collapsible',
      label: 'Why each option is right or wrong (optional)',
      admin: { initCollapsed: true },
      fields: [whyField('A'), whyField('B'), whyField('C'), whyField('D')],
    },
    {
      name: 'hint',
      type: 'textarea',
      admin: { rows: 2 },
    },
    {
      type: 'row',
      fields: [
        urlField('blogPostUrl', 'Study guide link', true),
        urlField('referenceUrl', 'Official reference link'),
      ],
    },
    {
      name: 'level',
      type: 'select',
      label: 'Difficulty',
      options: [
        { label: 'Easy', value: 'easy' },
        { label: 'Medium', value: 'medium' },
        { label: 'Hard', value: 'hard' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'questionType',
      type: 'select',
      defaultValue: 'single',
      options: [{ label: 'Single answer', value: 'single' }],
      admin: { position: 'sidebar' },
    },
    {
      name: 'contentHash',
      type: 'text',
      unique: true,
      access: { read: adminOnlyRead },
      admin: { hidden: true },
    },
    // Replaced by the fields above; kept (hidden) so existing data isn't
    // dropped. src/scripts/upgrade-content.ts copies these into the new fields.
    {
      name: 'options',
      type: 'array',
      admin: { hidden: true },
      fields: [
        { name: 'text', type: 'text' },
        { name: 'isCorrect', type: 'checkbox', defaultValue: false, access: { read: adminOnlyRead } },
      ],
    },
    {
      name: 'topic',
      type: 'text',
      admin: { hidden: true },
    },
    {
      name: 'difficulty',
      type: 'select',
      defaultValue: 'beginner',
      options: [
        { label: 'Beginner', value: 'beginner' },
        { label: 'Intermediate', value: 'intermediate' },
        { label: 'Advanced', value: 'advanced' },
      ],
      admin: { hidden: true },
    },
  ],
  hooks: {
    beforeChange: [
      ({ data, originalDoc }) => {
        const certification = data.certification ?? originalDoc?.certification
        const certId = typeof certification === 'object' ? certification?.id : certification
        const text = data.questionText ?? originalDoc?.questionText
        if (certId && typeof text === 'string') {
          data.contentHash = questionHash(certId, text)
        }
        return data
      },
    ],
  },
}
