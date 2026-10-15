import Link from 'next/link'
import React from 'react'

import { LEGAL_PAGES } from '@/components/site/LegalPage'
import { LogoLink } from '@/components/site/SiteHeader'
import { ThemeToggle } from '@/components/site/ThemeToggle'
import { homeData } from '@/site/data'
import { categoryHref } from '@/site/taxonomy'

// Site footer. Always dark navy, in both light and dark mode.
export async function Footer() {
  const data = await homeData().catch(() => null)
  const categories = (data?.categories || []).filter((c) => c.count > 0).slice(0, 6)
  const column = 'flex flex-col gap-3 text-sm'
  const heading = 'text-xs font-bold uppercase tracking-[0.06em] text-hero-muted'
  const link = 'text-hero-body no-underline hover:text-white'

  return (
    <footer className="mt-auto bg-[#0B1220] text-white">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-10 px-4 py-14 sm:px-6 lg:flex-row lg:justify-between">
        <div className="max-w-xs">
          <LogoLink onDark />
          <p className="mt-4 text-sm leading-relaxed text-hero-body">
            Free practice exams and study guides for IT certifications. Original questions written from the official exam
            objectives, with every answer explained.
          </p>
          <ThemeToggle withLabel className="mt-4 border border-hero-border px-3 text-hero-body hover:text-white" />
        </div>

        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          <nav aria-label="Popular exams" className={column}>
            <span className={heading}>Popular exams</span>
            {(data?.footerCerts || []).map((c) => (
              <Link key={c.slug} href={`/certifications/${c.slug}`} className={link}>
                {c.title}
              </Link>
            ))}
            <Link href="/certifications" className={link}>
              All certifications
            </Link>
          </nav>
          {categories.length > 0 && (
            <nav aria-label="Categories" className={column}>
              <span className={heading}>Categories</span>
              {categories.map((c) => (
                <Link key={c.value} href={categoryHref(c.value)} className={link}>
                  {c.label}
                </Link>
              ))}
            </nav>
          )}
          <nav aria-label="Resources" className={column}>
            <span className={heading}>Resources</span>
            <Link href="/posts" className={link}>
              Study guides
            </Link>
            <Link href="/vendors" className={link}>
              Vendors
            </Link>
            <Link href="/categories" className={link}>
              Categories
            </Link>
            <Link href="/faq" className={link}>
              FAQ
            </Link>
            <Link href="/search" className={link}>
              Search
            </Link>
            <Link href="/signup" className={link}>
              Create a free account
            </Link>
          </nav>
          <nav aria-label="Company and legal" className={column}>
            <span className={heading}>Company and legal</span>
            {LEGAL_PAGES.map((p) => (
              <Link key={p.path} href={p.path} className={link}>
                {p.name}
              </Link>
            ))}
          </nav>
        </div>
      </div>
      <div className="border-t border-hero-border">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-2 px-4 py-5 text-xs leading-relaxed text-hero-muted sm:px-6">
          <span>&copy; {new Date().getFullYear()} CertGenius. All rights reserved.</span>
          <span>
            CertGenius is an independent study resource and is not affiliated with, endorsed by or sponsored by any certification
            vendor. All vendor names, exam names and exam codes are trademarks of their respective owners. Practice questions are
            original and are not taken from real exams.
          </span>
        </div>
      </div>
    </footer>
  )
}
