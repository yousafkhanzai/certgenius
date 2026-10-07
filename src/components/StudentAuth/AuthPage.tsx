import React from 'react'

import { AuthForm } from './AuthForm'

export function AuthPage({ mode, next }: { mode: 'login' | 'signup'; next: string }) {
  return (
    <div className="container flex justify-center py-16 md:py-24">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-sm md:p-10">
        <h1 className="mb-2 text-2xl font-extrabold tracking-tight md:text-3xl">
          {mode === 'signup' ? 'Create your free account' : 'Welcome back'}
        </h1>
        <p className="mb-8 text-muted-foreground">
          {mode === 'signup'
            ? 'Save your progress, bookmarks and exam scores. Always free.'
            : 'Log in to continue practicing.'}
        </p>
        <AuthForm mode={mode} next={next} />
      </div>
    </div>
  )
}
