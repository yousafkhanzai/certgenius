# CertGenius

An AI certification exam-prep website built with Next.js and Payload CMS. Publish certifications, practice questions, and blog posts through an admin dashboard (similar to WordPress's wp-admin) - no coding required for day-to-day use.

See **CertGenius Setup Guide.docx** (delivered alongside this project) for the full, non-technical, step-by-step walkthrough covering local setup, going live, and how to publish content. This README is a quick technical reference.

## Running it locally

```bash
npm install
npm run dev
```

Then open:
- http://localhost:3000 - the public website
- http://localhost:3000/admin - the admin dashboard

On first run, the database schema is created automatically from `src/collections/`.

## Loading the sample content

The project ships with a seed script that adds an admin login, two sample certifications (AWS AI Practitioner, Azure AI Fundamentals) with 5 practice questions each, and one sample blog post:

```bash
SEED_ADMIN_EMAIL="you@example.com" SEED_ADMIN_PASSWORD="ChangeMe123!" npm run seed
```

Then log in at `/admin` with that email/password (change the password immediately from the admin dashboard).

## Project structure

- `src/collections/Certifications` - the Certification content type (title, vendor, difficulty, overview, etc.)
- `src/collections/Questions` - the Practice Question content type (belongs to a Certification, has answer options)
- `src/collections/Posts` - the Blog content type (already part of the base template)
- `src/app/(frontend)/certifications` - the public certification listing, detail, and practice-test pages
- `src/components/PracticeTest` - the interactive quiz engine
- `src/seed/run.ts` - the sample content seed script

## Database

Uses a hosted Postgres database (Neon) via `DATABASE_URL` in `.env` - same database for local development and production, so there's nothing to swap when going live.

## Credits

Built on the official [Payload Website Template](https://github.com/payloadcms/payload/tree/main/templates/website) (Next.js + Payload CMS 3.88.0).
