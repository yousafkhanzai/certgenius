import type { CollectionConfig } from 'payload'

import { anyone } from '../../access/anyone'
import { authenticated } from '../../access/authenticated'

// One row here = one practice question. Each question belongs to a
// Certification, has 2-6 answer choices, and you mark which one is correct.
export const Questions: CollectionConfig = {
  slug: 'questions',
  labels: {
    singular: 'Practice Question',
    plural: 'Practice Questions',
  },
  access: {
    create: authenticated,
    delete: authenticated,
    read: anyone,
    update: authenticated,
  },
  admin: {
    useAsTitle: 'questionText',
    defaultColumns: ['questionText', 'certification', 'difficulty', 'updatedAt'],
    group: 'Certification Content',
  },
  fields: [
    {
      name: 'certification',
      type: 'relationship',
      relationTo: 'certifications',
      required: true,
      hasMany: false,
      admin: {
        description: 'Which certification is this question for?',
      },
    },
    {
      name: 'questionText',
      type: 'textarea',
      required: true,
      label: 'Question',
    },
    {
      name: 'options',
      type: 'array',
      label: 'Answer Choices',
      minRows: 2,
      maxRows: 6,
      required: true,
      admin: {
        description: 'Add each possible answer, and tick "Correct answer" on the right one(s).',
      },
      fields: [
        {
          name: 'text',
          type: 'text',
          required: true,
        },
        {
          name: 'isCorrect',
          type: 'checkbox',
          defaultValue: false,
          label: 'Correct answer',
        },
      ],
    },
    {
      name: 'explanation',
      type: 'textarea',
      admin: {
        description: 'Shown after the user answers - why the correct answer is correct.',
      },
    },
    {
      name: 'topic',
      type: 'text',
      admin: {
        description: 'Exam domain/topic this question covers, e.g. "Networking" (optional)',
      },
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
      admin: {
        position: 'sidebar',
      },
    },
  ],
}
