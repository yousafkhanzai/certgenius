import Link from 'next/link'
import React from 'react'

import type { HeaderStats } from '@/quiz/progress'
import { FlameIcon, LogoMark } from './ui'

// Header for the quiz start and results screens (designs 01 and 04).
export function StudentHeader({
  stats,
  active,
  next,
}: {
  stats: HeaderStats | null
  active?: 'certifications' | 'guides' | 'bookmarks'
  next: string
}) {
  const navLink = (href: string, label: string, isActive: boolean) => (
    <Link
      href={href}
      className={`rounded-lg px-3 py-2 no-underline hover:text-[#0B1220] ${isActive ? 'bg-[#F2F4F7] text-[#0B1220]' : 'text-[#475467]'}`}
    >
      {label}
    </Link>
  )
  const goalPct = stats ? Math.min(100, Math.round((stats.answeredToday / stats.dailyGoal) * 100)) : 0

  return (
    <header className="border-b border-[#E4E7EC] bg-white">
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3.5 sm:px-6">
        {/* Phones: logo and stats share the first row, navigation goes underneath. */}
        <div className="contents sm:order-1 sm:flex sm:flex-wrap sm:items-center sm:gap-8">
          <Link href="/" className="order-1 flex items-center gap-2.5 text-[#0B1220] no-underline hover:text-[#0B1220]">
            <LogoMark />
            <span className="text-[19px] font-extrabold tracking-[-0.03em]">CertGenius</span>
          </Link>
          <nav aria-label="Main" className="order-3 flex w-full flex-wrap gap-1 text-[15px] font-medium sm:w-auto">
            {navLink('/certifications', 'Certifications', active === 'certifications')}
            {navLink('/posts', 'Study guides', active === 'guides')}
            {stats && navLink('/bookmarks', 'Bookmarks', active === 'bookmarks')}
          </nav>
        </div>

        {stats ? (
          <div className="order-2 flex flex-wrap items-center gap-2.5">
            <span
              className="flex h-9 items-center gap-1.5 rounded-full bg-[#FFFAEB] px-3 text-sm font-semibold text-[#93370D]"
              aria-label={`${stats.streak}-day streak`}
            >
              <FlameIcon size={16} strokeWidth={2.2} />
              <span>
                {stats.streak}
                <span className="hidden sm:inline">-day streak</span>
              </span>
            </span>
            <span
              className="hidden h-9 items-center gap-2 rounded-full bg-[#F2F4F7] px-3 text-sm font-semibold text-[#344054] sm:flex"
              title="Questions answered today against your daily goal"
            >
              <span className="block h-1.5 w-16 rounded-full bg-[#E4E7EC]">
                <span className="block h-1.5 rounded-full bg-[#2B44E8]" style={{ width: `${goalPct}%` }} />
              </span>
              {stats.answeredToday} / {stats.dailyGoal} today
            </span>
            <Link
              href="/account"
              aria-label="My profile"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0B1220] text-sm font-semibold text-white no-underline hover:text-white"
            >
              {stats.initials}
            </Link>
          </div>
        ) : (
          <div className="order-2 flex items-center gap-2">
            <Link
              href={`/login?next=${encodeURIComponent(next)}`}
              className="rounded-lg px-3 py-2 text-[15px] font-semibold text-[#0B1220] no-underline hover:bg-[#F2F4F7] hover:text-[#0B1220]"
            >
              Log in
            </Link>
            <Link
              href={`/signup?next=${encodeURIComponent(next)}`}
              className="rounded-xl bg-[#2B44E8] px-4 py-2 text-[15px] font-bold text-white no-underline hover:bg-[#1A2DB0] hover:text-white"
            >
              Sign up free
            </Link>
          </div>
        )}
      </div>
    </header>
  )
}
