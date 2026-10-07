import { postgresAdapter } from '@payloadcms/db-postgres'
import sharp from 'sharp'
import path from 'path'
import { buildConfig, PayloadRequest } from 'payload'
import { fileURLToPath } from 'url'

import { Categories } from './collections/Categories'
import { Certifications } from './collections/Certifications'
import { Media } from './collections/Media'
import { Pages } from './collections/Pages'
import { Posts } from './collections/Posts'
import { Questions } from './collections/Questions'
import { Users } from './collections/Users'
import { Students } from './collections/Students'
import {
  AnswerStats,
  AttemptAnswers,
  Attempts,
  Bookmarks,
  ProblemReports,
} from './collections/StudentActivity'
import { Footer } from './Footer/config'
import { Header } from './Header/config'
import { plugins } from './plugins'
import { defaultLexical } from '@/fields/defaultLexical'
import { getServerSideURL } from './utilities/getURL'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

// Every address this site is served from: the configured URL, Vercel's
// production/preview hostnames, and localhost while developing.
const trustedOrigins = Array.from(
  new Set(
    [
      getServerSideURL(),
      'https://certgenius.vercel.app',
      process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`,
      process.env.VERCEL_BRANCH_URL && `https://${process.env.VERCEL_BRANCH_URL}`,
      process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`,
      process.env.NODE_ENV !== 'production' && 'http://localhost:3000',
    ].filter((origin): origin is string => Boolean(origin)),
  ),
)

export default buildConfig({
  admin: {
    components: {
      // The `BeforeLogin` component renders a message that you see while logging into your admin panel.
      // Feel free to delete this at any time. Simply remove the line below.
      beforeLogin: ['@/components/BeforeLogin'],
      // The `BeforeDashboard` component renders the 'welcome' block that you see after logging into your admin panel.
      // Feel free to delete this at any time. Simply remove the line below.
      // `StaleContentBanner` lists Blog Posts, Pages, and Certifications that
      // haven't been updated in 3+ months, right below it.
      beforeDashboard: ['@/components/BeforeDashboard', '@/components/StaleContentBanner'],
      afterNavLinks: ['@/components/Importer/NavLink'],
      views: {
        // /admin/import - spreadsheet importer for questions and certifications.
        importer: {
          Component: '@/components/Importer',
          path: '/import',
          meta: { title: 'Import spreadsheets' },
        },
      },
    },
    importMap: {
      baseDir: path.resolve(dirname),
    },
    user: Users.slug,
    livePreview: {
      breakpoints: [
        {
          label: 'Mobile',
          name: 'mobile',
          width: 375,
          height: 667,
        },
        {
          label: 'Tablet',
          name: 'tablet',
          width: 768,
          height: 1024,
        },
        {
          label: 'Desktop',
          name: 'desktop',
          width: 1440,
          height: 900,
        },
      ],
    },
  },
  // This config helps us configure global or default features that the other editors can inherit
  editor: defaultLexical,
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL,
    },
    // Auto-create/update database tables to match the collections above.
    // Normally Payload only does this outside of production, but since this
    // project doesn't use migration files yet, force it on so a brand new
    // database (like a fresh Neon project) gets its tables created on first
    // deploy instead of failing with "relation does not exist."
    push: true,
  }),
  collections: [
    Pages,
    Posts,
    Certifications,
    Questions,
    Media,
    Categories,
    Users,
    Students,
    Attempts,
    AttemptAnswers,
    Bookmarks,
    AnswerStats,
    ProblemReports,
  ],
  cors: trustedOrigins,
  // Login cookies are only honoured on requests coming from our own site, so
  // another website can't make a visitor's browser act on their account.
  csrf: trustedOrigins,
  globals: [Header, Footer],
  plugins,
  secret: process.env.PAYLOAD_SECRET,
  sharp,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  jobs: {
    access: {
      run: ({ req }: { req: PayloadRequest }): boolean => {
        // Allow logged in admins to execute this endpoint (not students)
        if (req.user?.collection === 'users') return true

        const secret = process.env.CRON_SECRET
        if (!secret) return false

        // If there is no logged in user, then check
        // for the Vercel Cron secret to be present as an
        // Authorization header:
        const authHeader = req.headers.get('authorization')
        return authHeader === `Bearer ${secret}`
      },
    },
    tasks: [],
  },
})
