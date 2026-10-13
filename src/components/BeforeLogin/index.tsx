import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import type { Payload } from 'payload'
import React from 'react'

import { gateIsOpen } from '@/security/adminGate'

// Shown above the admin login form. Before anything is shown, the pattern
// lock is checked: without it the visitor is sent to the pattern screen.
// (The login API refuses them too - see src/collections/Users.)
const BeforeLogin = async ({ payload }: { payload: Payload }) => {
  if (!(await gateIsOpen(payload, (await headers()).get('cookie')))) redirect('/admin-gate')

  return (
    <div>
      <p>
        <b>CertGenius admin.</b>
        {' Owner access only.'}
      </p>
    </div>
  )
}

export default BeforeLogin
