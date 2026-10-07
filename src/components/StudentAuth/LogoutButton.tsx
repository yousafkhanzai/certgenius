'use client'

import { useRouter } from 'next/navigation'
import React, { useState } from 'react'

import { Button } from '@/components/ui/button'

export function LogoutButton() {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={async () => {
        setPending(true)
        await fetch('/api/students/logout', { method: 'POST', credentials: 'include' })
        router.replace('/')
        router.refresh()
      }}
    >
      {pending ? 'Logging out...' : 'Log out'}
    </Button>
  )
}
