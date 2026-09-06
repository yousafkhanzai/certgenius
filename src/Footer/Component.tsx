import { getCachedGlobal } from '@/utilities/getGlobals'
import Link from 'next/link'
import React from 'react'

import { ThemeSelector } from '@/providers/Theme/ThemeSelector'
import { CMSLink } from '@/components/Link'
import { Logo } from '@/components/Logo/Logo'

export async function Footer() {
  const footerData = await getCachedGlobal('footer', 1)()

  const navItems = footerData?.navItems || []

  return (
    // Fixed dark navy regardless of site theme (not bg-foreground/text-background,
    // which would flip to a light footer when the site is in dark mode).
    <footer className="mt-auto bg-[oklch(20%_0.032_258deg)] text-white">
      <div className="container py-14 gap-10 flex flex-col md:flex-row md:justify-between border-b border-white/10">
        <div className="max-w-xs">
          <Link className="flex items-center" href="/">
            <Logo className="text-white" />
          </Link>
          <p className="mt-4 text-sm leading-relaxed text-white/55">
            Free, exam-accurate practice tests and study guides for the certifications that
            matter most in AI, cloud, and IT.
          </p>
        </div>

        <div className="flex flex-col-reverse items-start gap-6 md:flex-row md:items-start">
          <ThemeSelector />
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-white/45 mb-4">
              Explore
            </div>
            <nav className="flex flex-col gap-3 text-sm">
              {navItems.map(({ link }, i) => {
                return <CMSLink className="text-white/75 hover:text-white" key={i} {...link} />
              })}
            </nav>
          </div>
        </div>
      </div>
      <div className="container py-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between text-xs text-white/45">
        <div>&copy; {new Date().getFullYear()} CertGenius. All rights reserved.</div>
        <div>Not affiliated with AWS, Microsoft, or Google.</div>
      </div>
    </footer>
  )
}
