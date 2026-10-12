'use client'

import { Moon, Sun } from 'lucide-react'
import React, { useEffect, useState } from 'react'

import { useTheme } from '@/providers/Theme'

// Light/dark switch used in the header and the footer.
export function ThemeToggle({ className = '', withLabel = false }: { className?: string; withLabel?: boolean }) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const dark = mounted && theme === 'dark'
  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? 'light' : 'dark')}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-pressed={dark}
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl px-2.5 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${className}`}
    >
      {dark ? <Sun className="h-[18px] w-[18px]" aria-hidden="true" /> : <Moon className="h-[18px] w-[18px]" aria-hidden="true" />}
      {withLabel && <span>{dark ? 'Light mode' : 'Dark mode'}</span>}
    </button>
  )
}
