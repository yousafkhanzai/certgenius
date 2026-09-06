import type { CollectionConfig } from 'payload'
import { slugField } from 'payload'

import { anyone } from '../../access/anyone'
import { authenticated } from '../../access/authenticated'
import { authenticatedOrPublished } from '../../access/authenticatedOrPublished'

// This collection is where you publish each certification that visitors can study for.
// Every field here shows up as a simple form field in the admin dashboard -
// no coding needed to add a new certification.
export const Certifications: CollectionConfig = {
  slug: 'certifications',
  labels: {
    singular: 'Certification',
    plural: 'Certifications',
  },
  access: {
    create: authenticated,
    delete: authenticated,
    read: authenticatedOrPublished,
    update: authenticated,
  },
  admin: {
    components: {
      edit: {
        // Shows a "this is 3+ months old" reminder right on the edit screen.
        beforeDocumentControls: ['@/components/StaleDocumentNotice'],
      },
    },
    useAsTitle: 'title',
    defaultColumns: ['title', 'vendor', 'category', 'difficulty', 'updatedAt'],
    group: 'Certification Content',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      admin: {
        description: 'e.g. "AWS Certified AI Practitioner"',
      },
    },
    slugField(),
    {
      name: 'vendor',
      type: 'text',
      admin: {
        description: 'Who issues this certification, e.g. "AWS", "Microsoft", "CompTIA"',
      },
    },
    {
      name: 'examCode',
      type: 'text',
      admin: {
        description: 'Official exam code, e.g. "AIF-C01" (optional)',
      },
    },
    {
      name: 'category',
      type: 'relationship',
      relationTo: 'categories',
      hasMany: true,
      admin: {
        position: 'sidebar',
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
    {
      name: 'heroImage',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'summary',
      type: 'textarea',
      admin: {
        description: 'Short 1-2 sentence summary shown on listing cards.',
      },
    },
    {
      name: 'overview',
      type: 'richText',
      label: 'Full Overview',
      admin: {
        description:
          'The main description shown on the certification page - who it is for, what it covers, exam format, etc.',
      },
    },
    {
      name: 'passingScore',
      type: 'number',
      admin: {
        description: 'Passing score percentage, e.g. 70 (optional)',
      },
    },
    {
      name: 'durationMinutes',
      type: 'number',
      admin: {
        description: 'Real exam time limit in minutes (optional)',
      },
    },
    {
      name: 'affiliateLink',
      type: 'text',
      admin: {
        description:
          'Optional link to an official training course, book, or exam registration (used for affiliate/monetization links).',
      },
    },
    {
      name: 'publishedAt',
      type: 'date',
      admin: {
        date: { pickerAppearance: 'dayAndTime' },
        position: 'sidebar',
      },
      hooks: {
        beforeChange: [
          ({ siblingData, value }) => {
            if (siblingData._status === 'published' && !value) {
              return new Date()
            }
            return value
          },
        ],
      },
    },
  ],
  versions: {
    drafts: {
      autosave: { interval: 100 },
    },
    maxPerDoc: 20,
  },
}
