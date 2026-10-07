'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Props = {
  mode: 'login' | 'signup'
  next: string
}

async function post(url: string, body: Record<string, string>) {
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  return { ok: res.ok, json }
}

// Payload error responses look like { errors: [{ message, data: { errors: [{ message }] } }] }.
function firstError(json: { errors?: Array<{ message?: string; data?: { errors?: Array<{ message?: string }> } }> }) {
  const err = json?.errors?.[0]
  return err?.data?.errors?.[0]?.message || err?.message || 'Something went wrong. Please try again.'
}

export function AuthForm({ mode, next }: Props) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const isSignup = mode === 'signup'

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    const form = new FormData(event.currentTarget)
    const email = String(form.get('email') || '').trim()
    const password = String(form.get('password') || '')
    const name = String(form.get('name') || '').trim()

    if (isSignup && password.length < 10) {
      setError('Password must be at least 10 characters.')
      return
    }

    setPending(true)
    try {
      if (isSignup) {
        const created = await post('/api/students', { email, password, name })
        if (!created.ok) {
          // Don't reveal whether an email is registered beyond Payload's own message.
          setError(firstError(created.json))
          return
        }
      }
      const login = await post('/api/students/login', { email, password })
      if (!login.ok) {
        setError(
          login.json?.errors?.[0]?.message?.toLowerCase().includes('locked')
            ? 'Too many attempts. This account is locked for 15 minutes.'
            : 'That email and password combination is not correct.',
        )
        return
      }
      router.replace(next)
      router.refresh()
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate={false}>
      {isSignup && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">Name (optional)</Label>
          <Input id="name" name="name" autoComplete="name" maxLength={80} className="h-11" />
        </div>
      )}
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
          className="h-11"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete={isSignup ? 'new-password' : 'current-password'}
          required
          minLength={isSignup ? 10 : undefined}
          maxLength={128}
          aria-describedby={isSignup ? 'password-help' : undefined}
          className="h-11"
        />
        {isSignup && (
          <p id="password-help" className="text-sm text-muted-foreground">
            At least 10 characters.
          </p>
        )}
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-[#FEF3F2] px-4 py-3 text-sm font-medium text-[#B42318]">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? 'Please wait...' : isSignup ? 'Create free account' : 'Log in'}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        {isSignup ? 'Already have an account? ' : 'New to CertGenius? '}
        <Link
          className="font-semibold text-primary underline-offset-4 hover:underline"
          href={`${isSignup ? '/login' : '/signup'}?next=${encodeURIComponent(next)}`}
        >
          {isSignup ? 'Log in' : 'Create a free account'}
        </Link>
      </p>
    </form>
  )
}
