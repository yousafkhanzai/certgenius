'use client'

import { Menu, Search, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { useEffect, useState } from 'react'

import { ThemeToggle } from './ThemeToggle'

const NAV = [
  { href: '/certifications', label: 'Certifications' },
  { href: '/posts', label: 'Study guides' },
  { href: '/faq', label: 'FAQ' },
]

export function LogoLink({ onDark = false }: { onDark?: boolean }) {
  return (
    <Link href="/" className={`flex items-center gap-2.5 no-underline ${onDark ? 'text-white hover:text-white' : 'text-foreground hover:text-foreground'}`}>
      <span
        className={`flex h-8 w-8 flex-none items-center justify-center rounded-[9px] ${onDark ? 'bg-white text-[#0B1220]' : 'bg-[#0B1220] text-white dark:bg-white dark:text-[#0B1220]'}`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 12l5 5L20 6" />
        </svg>
      </span>
      <span className="text-[19px] font-extrabold tracking-[-0.03em]">CertGenius</span>
    </Link>
  )
}

type Me = { initials: string } | null

// Site header. Login state is read in the browser so pages stay static and fast.
export function SiteHeader() {
  const pathname = usePathname() || '/'
  const [open, setOpen] = useState(false)
  const [me, setMe] = useState<Me | undefined>(undefined)

  useEffect(() => setOpen(false), [pathname])
  useEffect(() => {
    let cancelled = false
    fetch('/api/students/me', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return
        const user = data?.user
        if (!user) return setMe(null)
        const parts = String(user.name || user.email || '?')
          .trim()
          .split(/[\s@._-]+/)
          .filter(Boolean)
        setMe({ initials: ((parts[0]?.[0] || '?') + (parts[1]?.[0] || '')).toUpperCase() })
      })
      .catch(() => !cancelled && setMe(null))
    return () => {
      cancelled = true
    }
  }, [pathname])

  const linkClass = (href: string) =>
    `rounded-lg px-3 py-2 no-underline hover:text-foreground ${
      href !== '/' && !href.startsWith('/#') && pathname.startsWith(href) ? 'bg-muted text-foreground' : 'text-muted-foreground'
    }`

  const account =
    me === undefined ? (
      <span className="h-10 w-[150px]" aria-hidden="true" />
    ) : me ? (
      <Link
        href="/account"
        aria-label="My profile"
        className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0B1220] text-sm font-semibold text-white no-underline hover:text-white dark:bg-white dark:text-[#0B1220]"
      >
        {me.initials}
      </Link>
    ) : (
      <>
        <Link href="/login" className="rounded-lg px-3 py-2 text-[15px] font-semibold text-foreground no-underline hover:bg-muted hover:text-foreground">
          Log in
        </Link>
        <Link
          href="/signup"
          className="rounded-xl bg-primary px-4 py-2 text-[15px] font-bold text-primary-foreground no-underline hover:bg-primary-hover hover:text-primary-foreground"
        >
          Sign up free
        </Link>
      </>
    )

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-8">
          <LogoLink />
          <nav aria-label="Main" className="hidden gap-1 text-[15px] font-medium lg:flex">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className={linkClass(n.href)}>
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-1.5">
          <Link
            href="/search"
            aria-label="Search"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Search className="h-[18px] w-[18px]" aria-hidden="true" />
          </Link>
          <ThemeToggle className="text-muted-foreground hover:bg-muted hover:text-foreground" />
          <div className="hidden items-center gap-1.5 sm:flex">{account}</div>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-foreground hover:bg-muted lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen(!open)}
          >
            {open ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>
      </div>
      {open && (
        <div id="mobile-menu" className="border-t border-border bg-card px-4 pb-4 pt-2 lg:hidden">
          <nav aria-label="Main mobile" className="flex flex-col text-base font-medium">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="rounded-lg px-3 py-3 text-foreground no-underline hover:bg-muted" onClick={() => setOpen(false)}>
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="mt-2 flex items-center gap-2 sm:hidden">{account}</div>
        </div>
      )}
    </header>
  )
}
