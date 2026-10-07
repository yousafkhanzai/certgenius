import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import React from 'react'

import { AuthPage } from '@/components/StudentAuth/AuthPage'
import { getStudent, safeNextPath } from '@/utilities/getStudent'

type Args = { searchParams: Promise<{ next?: string | string[] }> }

export default async function LoginPage({ searchParams }: Args) {
  const next = safeNextPath((await searchParams).next)
  if (await getStudent()) redirect(next)
  return <AuthPage mode="login" next={next} />
}

export const metadata: Metadata = {
  title: 'Log in | CertGenius',
  robots: { index: false },
}
