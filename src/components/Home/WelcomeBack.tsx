'use client'

import Link from 'next/link'
import React, { useEffect, useState } from 'react'

type Summary = {
  student: { name: string | null; streak: number; answeredToday: number; dailyGoal: number } | null
  cert: { slug: string; title: string; readiness: number | null; passScore: number; weakestDomain: string | null } | null
}

// "Welcome back" strip for logged-in students. Loaded in the browser, so the
// homepage stays static; guests never see it.
export function WelcomeBack() {
  const [data, setData] = useState<Summary | null>(null)
  useEffect(() => {
    fetch('/api/quiz/summary', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .catch(() => undefined)
  }, [])
  if (!data?.student) return null
  const { student, cert } = data
  const quiz = cert ? `/certifications/${cert.slug}/quiz` : '/certifications'
  const shortcuts = [
    { href: quiz, label: 'Mock exam', note: cert ? cert.title : 'Pick a certification' },
    { href: quiz, label: 'Domain practice', note: cert?.weakestDomain ? `Weakest: ${cert.weakestDomain}` : 'Choose a domain' },
    { href: '/bookmarks', label: 'Bookmarks', note: 'Saved questions' },
    { href: '/account', label: 'Exam history', note: 'Your results' },
  ]
  return (
    <section aria-label="Welcome back" className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-center gap-x-8 gap-y-4 px-4 py-5 sm:px-6">
        <div className="flex flex-col">
          <span className="text-lg font-bold">Welcome back{student.name ? `, ${student.name}` : ''}</span>
          <span className="text-sm text-muted-foreground">
            {cert
              ? cert.readiness === null
                ? `${cert.title}: take a mock exam to measure your readiness`
                : `${cert.title}: ${cert.readiness}% ready${cert.passScore ? ` (pass mark ${cert.passScore}%)` : ''}`
              : 'Pick a certification to get started'}
            {' · '}
            {student.streak}-day streak · {student.answeredToday} / {student.dailyGoal} today
          </span>
        </div>
        <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-4">
          {shortcuts.map((s) => (
            <Link
              key={s.label}
              href={s.href}
              className="flex min-w-0 flex-col rounded-xl border border-border bg-background px-3.5 py-2.5 text-foreground no-underline hover:border-primary hover:text-foreground"
            >
              <span className="text-sm font-bold">{s.label}</span>
              <span className="truncate text-xs text-muted-foreground">{s.note}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
