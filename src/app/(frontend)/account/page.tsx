import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import React from 'react'

import { LogoutButton } from '@/components/StudentAuth/LogoutButton'
import { getStudent } from '@/utilities/getStudent'

// Minimal account page for Phase 1; the full profile (readiness, mastery,
// streak, exam history) arrives in Phase 3.
export default async function AccountPage() {
  const student = await getStudent()
  if (!student) redirect('/login?next=/account')

  return (
    <div className="container max-w-2xl py-16 md:py-24">
      <h1 className="mb-2 text-2xl font-extrabold tracking-tight md:text-3xl">
        {student.name ? `Hi, ${student.name}` : 'Your account'}
      </h1>
      <p className="mb-8 text-muted-foreground">{student.email}</p>

      <dl className="mb-10 grid grid-cols-2 gap-4">
        <div className="rounded-2xl border border-border bg-card p-6">
          <dt className="text-sm text-muted-foreground">Daily goal</dt>
          <dd className="text-2xl font-bold">{student.dailyGoal ?? 25} questions</dd>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6">
          <dt className="text-sm text-muted-foreground">Current streak</dt>
          <dd className="text-2xl font-bold">
            {student.currentStreak ?? 0} day{student.currentStreak === 1 ? '' : 's'}
          </dd>
        </div>
      </dl>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/certifications"
          className="inline-flex h-10 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground no-underline hover:bg-primary/90"
        >
          Browse certifications
        </Link>
        <LogoutButton />
      </div>
    </div>
  )
}

export const metadata: Metadata = {
  title: 'Your account | CertGenius',
  robots: { index: false },
}
