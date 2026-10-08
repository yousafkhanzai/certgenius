'use client'

import { useRouter } from 'next/navigation'
import React, { useState } from 'react'

const OPTIONS = [10, 25, 50, 100]

// Lets a student change their daily question goal (stored on their account).
export function DailyGoalForm({ studentId, current }: { studentId: number | string; current: number }) {
  const router = useRouter()
  const [goal, setGoal] = useState(current)
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const save = async (value: number) => {
    setGoal(value)
    setState('saving')
    const res = await fetch(`/api/students/${studentId}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dailyGoal: value }),
    })
    setState(res.ok ? 'saved' : 'error')
    if (res.ok) router.refresh()
  }

  return (
    <div className="flex flex-col gap-2">
      <div role="group" aria-label="Daily goal" className="grid grid-cols-4 gap-1.5 rounded-xl bg-[#F2F4F7] p-1">
        {OPTIONS.map((n) => {
          const on = goal === n
          return (
            <button
              key={n}
              type="button"
              aria-pressed={on}
              disabled={state === 'saving'}
              onClick={() => save(n)}
              className={`h-10 rounded-[9px] text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2B44E8] ${
                on ? 'bg-white font-bold text-[#0B1220] shadow-[0_1px_3px_rgba(16,24,40,0.12)]' : 'bg-transparent font-semibold text-[#475467]'
              }`}
            >
              {n}
            </button>
          )
        })}
      </div>
      <span aria-live="polite" className="text-[13px] text-[#475467]">
        {state === 'saving'
          ? 'Saving...'
          : state === 'saved'
            ? 'Daily goal saved.'
            : state === 'error'
              ? 'Could not save. Please try again.'
              : 'Questions per day'}
      </span>
    </div>
  )
}
