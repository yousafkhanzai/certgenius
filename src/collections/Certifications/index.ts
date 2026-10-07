import type { CollectionConfig } from 'payload'
import { slugField } from 'payload'

import { authenticated } from '../../access/authenticated'
import { authenticatedOrPublished } from '../../access/authenticatedOrPublished'
import { validateHttpUrl } from '../../access/roles'
import { certificationImportEndpoint } from '../../import/endpoints'
import { AFFILIATE_TYPES, CERT_CATEGORIES, CERT_STATUSES } from './options'

// This collection is where you publish each certification that visitors can study for.
// Every field here shows up as a simple form field in the admin dashboard -
// no coding needed to add a new certification.
//
// Database note: fields are only ever ADDED here, never renamed or removed,
// because the live database updates itself to match this file on deploy and a
// rename would drop that column's data. Older fields that the spec replaced
// (difficulty, category, affiliateLink) are kept but hidden.
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
    defaultColumns: ['title', 'examCode', 'vendor', 'certCategory', 'examStatus', 'updatedAt'],
    group: 'Certification Content',
    listSearchableFields: ['title', 'examCode', 'vendor', 'slug'],
  },
  endpoints: [certificationImportEndpoint],
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Name',
      required: true,
      admin: {
        description: 'e.g. "AWS Certified AI Practitioner"',
      },
    },
    slugField(),
    {
      // Not "status": Payload's draft/published flag already owns that
      // database type name (enum_certifications_status).
      name: 'examStatus',
      label: 'Status',
      type: 'select',
      defaultValue: 'active',
      options: [...CERT_STATUSES],
      index: true,
      admin: {
        position: 'sidebar',
        description: 'Retired and On hold certifications are hidden from listings.',
      },
    },
    {
      name: 'replacedBy',
      type: 'relationship',
      relationTo: 'certifications',
      admin: {
        position: 'sidebar',
        description: 'For retired exams: the certification that replaces it.',
        condition: (data) => data?.examStatus === 'retired',
      },
    },
    {
      name: 'certCategory',
      type: 'select',
      label: 'Category',
      options: [...CERT_CATEGORIES],
      index: true,
      admin: {
        position: 'sidebar',
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
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Exam facts',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'vendor',
                  type: 'text',
                  index: true,
                  admin: {
                    description: 'Who issues this certification, e.g. "AWS", "Blockchain Council"',
                  },
                },
                {
                  name: 'examCode',
                  type: 'text',
                  admin: {
                    description: 'e.g. "AIF-C01". Use our own code (e.g. "BC-CED") if the vendor has none.',
                  },
                },
              ],
            },
            {
              name: 'isSiteCode',
              type: 'checkbox',
              label: 'This is a CertGenius code (the vendor has no official exam code)',
              defaultValue: false,
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'passingScore',
                  type: 'number',
                  label: 'Pass score (%)',
                  min: 0,
                  max: 100,
                },
                {
                  name: 'examQuestionCount',
                  type: 'number',
                  label: 'Questions on the real exam',
                  min: 1,
                  max: 500,
                },
                {
                  name: 'durationMinutes',
                  type: 'number',
                  label: 'Exam time (minutes)',
                  min: 1,
                  max: 600,
                },
              ],
            },
            {
              name: 'delivery',
              type: 'text',
              admin: { description: 'e.g. "Online proctored or test centre"' },
            },
            {
              name: 'officialUrl',
              type: 'text',
              label: 'Official exam page',
              validate: validateHttpUrl,
            },
            {
              name: 'summary',
              type: 'textarea',
              admin: {
                description: 'Short 1-2 sentence summary shown on listing cards.',
              },
            },
            {
              name: 'heroImage',
              type: 'upload',
              relationTo: 'media',
            },
          ],
        },
        {
          label: 'Domains',
          fields: [
            {
              name: 'domains',
              type: 'array',
              labels: { singular: 'Domain', plural: 'Domains' },
              admin: {
                description:
                  'Exam domains. Imported questions must use one of these names exactly.',
              },
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'name', type: 'text', required: true },
                    {
                      name: 'weight',
                      type: 'number',
                      label: 'Weight (%)',
                      min: 0,
                      max: 100,
                    },
                  ],
                },
                {
                  name: 'studyGuide',
                  type: 'relationship',
                  relationTo: 'posts',
                },
              ],
            },
          ],
        },
        {
          label: 'About the exam',
          fields: [
            {
              name: 'overview',
              type: 'richText',
              label: 'Overview',
            },
            { name: 'whoItsFor', type: 'textarea', label: "Who it's for" },
            { name: 'background', type: 'textarea' },
            {
              name: 'roles',
              type: 'array',
              labels: { singular: 'Job role', plural: 'Job roles' },
              fields: [{ name: 'role', type: 'text', required: true }],
            },
            {
              type: 'row',
              fields: [
                { name: 'authorName', type: 'text' },
                { name: 'authorRole', type: 'text' },
              ],
            },
            {
              type: 'row',
              fields: [
                { name: 'reviewerName', type: 'text' },
                { name: 'reviewerCredential', type: 'text' },
              ],
            },
          ],
        },
        {
          label: 'Study plan & comparison',
          fields: [
            {
              name: 'studyPlan',
              type: 'array',
              labels: { singular: 'Week', plural: 'Weeks' },
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'label', type: 'text', admin: { description: 'e.g. "Week 1"' } },
                    { name: 'title', type: 'text' },
                  ],
                },
                { name: 'text', type: 'textarea' },
              ],
            },
            {
              name: 'comparisonRows',
              type: 'array',
              labels: { singular: 'Comparison row', plural: 'How it compares' },
              admin: {
                description:
                  'Rows of the "How it compares" table, e.g. Level / Foundational / Associate.',
              },
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'label', type: 'text', required: true },
                    { name: 'thisExam', type: 'text', label: 'This exam' },
                    { name: 'otherExam', type: 'text', label: 'Compared exam' },
                  ],
                },
              ],
            },
            {
              name: 'comparedExamName',
              type: 'text',
              admin: { description: 'Name of the exam in the "Compared exam" column.' },
            },
          ],
        },
        {
          label: 'Resources & FAQ',
          fields: [
            {
              name: 'officialResources',
              type: 'array',
              fields: [
                { name: 'name', type: 'text', required: true },
                { name: 'description', type: 'textarea' },
                { name: 'url', type: 'text', required: true, validate: validateHttpUrl },
              ],
            },
            {
              name: 'affiliateCourses',
              type: 'array',
              admin: {
                description: 'Shown with rel="sponsored nofollow" and an affiliate disclosure.',
              },
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'type',
                      type: 'select',
                      options: [...AFFILIATE_TYPES],
                      required: true,
                    },
                    { name: 'partner', type: 'text' },
                  ],
                },
                { name: 'title', type: 'text', required: true },
                { name: 'url', type: 'text', required: true, validate: validateHttpUrl },
                { name: 'bulletOne', type: 'text', label: 'Bullet point 1' },
                { name: 'bulletTwo', type: 'text', label: 'Bullet point 2' },
              ],
            },
            {
              name: 'relatedCertifications',
              type: 'relationship',
              relationTo: 'certifications',
              hasMany: true,
            },
            {
              name: 'faqs',
              type: 'array',
              labels: { singular: 'FAQ', plural: 'FAQs' },
              fields: [
                { name: 'question', type: 'text', required: true },
                { name: 'answer', type: 'textarea', required: true },
              ],
            },
          ],
        },
      ],
    },
    // Replaced by the fields above; kept so existing data isn't dropped.
    {
      name: 'category',
      type: 'relationship',
      relationTo: 'categories',
      hasMany: true,
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
    {
      name: 'affiliateLink',
      type: 'text',
      admin: { hidden: true },
    },
  ],
  versions: {
    drafts: {
      autosave: { interval: 100 },
    },
    maxPerDoc: 20,
  },
}
