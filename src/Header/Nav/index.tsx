'use client'

import React from 'react'

import type { Header as HeaderType } from '@/payload-types'

import { CMSLink } from '@/components/Link'
import Link from 'next/link'
import { SearchIcon } from 'lucide-react'

export const HeaderNav: React.FC<{ data: HeaderType }> = ({ data }) => {
  const navItems = data?.navItems || []

  return (
    <nav className="flex items-center gap-8">
      <div className="hidden md:flex items-center gap-7 text-sm font-medium text-secondary-foreground">
        {navItems.map(({ link }, i) => {
          return <CMSLink key={i} {...link} appearance="link" className="hover:text-primary" />
        })}
      </div>
      <div className="flex items-center gap-5">
        <Link href="/search" aria-label="Search">
          <span className="sr-only">Search</span>
          <SearchIcon className="w-[18px] h-[18px] text-secondary-foreground hover:text-primary" />
        </Link>
        <CMSLink
          type="custom"
          url="/certifications"
          label="Browse Certifications"
          appearance="default"
          size="sm"
        />
      </div>
    </nav>
  )
}
