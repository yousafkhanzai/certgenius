import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import React from 'react'

import { AuthPage } from '@/components/StudentAuth/AuthPage'
import { getStudent, safeNextPath } from '@/utilities/getStudent'

type Args = { searchParams: Promise<{ next?: string | string[] }> }

export default async function SignupPage({ searchParams }: Args) {
  const next = safeNextPath((await searchParams).next)
  if (await getStudent()) redirect(next)
  return <AuthPage mode="signup" next={next} />
}

export const metadata: Metadata = {
  title: 'Create a free account | CertGenius',
  description: 'Sign up free to save your practice progress, bookmarks and exam scores.',
}
