'use client'

import { usePathname } from 'next/navigation'
import React from 'react'

// Quiz screens bring their own headers (see content/quiz-designs): the start
// and results screens use the student header, and practice and exam sessions
// use a focus header with no site navigation and no footer.
const QUIZ_SCREEN = /^\/certifications\/[^/]+\/(quiz|practice|exam|results)(\/|$)/
const FOCUS_SCREEN = /^\/certifications\/[^/]+\/(practice|exam)(\/|$)/

export function ChromeGate({
  header,
  footer,
  children,
}: {
  header: React.ReactNode
  footer: React.ReactNode
  children: React.ReactNode
}) {
  const pathname = usePathname() || ''
  return (
    <>
      {!QUIZ_SCREEN.test(pathname) && header}
      {children}
      {!FOCUS_SCREEN.test(pathname) && footer}
    </>
  )
}
