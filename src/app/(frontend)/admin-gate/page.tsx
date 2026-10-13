import type { Metadata } from 'next'
import configPromise from '@payload-config'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import React from 'react'

import { GateClient } from '@/components/AdminGate/GateClient'
import { gateIsOpen } from '@/security/adminGate'

// The pattern lock in front of the admin login (see src/security/adminGate.ts).
export const dynamic = 'force-dynamic'

export default async function AdminGatePage() {
  const payload = await getPayload({ config: configPromise })
  if (await gateIsOpen(payload, (await headers()).get('cookie'))) redirect('/admin/login')

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0B1220] px-4 py-10 text-white">
      <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8">
        <h1 className="text-center text-xl font-bold">Restricted area</h1>
        <p className="mb-6 mt-2 text-center text-sm text-[#98A2B3]">Draw your pattern to continue.</p>
        <GateClient />
      </div>
    </main>
  )
}

export const metadata: Metadata = {
  title: 'Restricted area',
  robots: { index: false, follow: false },
}
