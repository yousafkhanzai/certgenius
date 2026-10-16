'use client'

import React, { useMemo, useState } from 'react'

import { countryOptions } from '@/utilities/countries'

// Lets a student correct the country detected from their internet connection.
export function CountryForm({ studentId, current }: { studentId: number | string; current: string | null }) {
  const options = useMemo(() => countryOptions(), [])
  const [country, setCountry] = useState(current || '')
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const save = async (value: string) => {
    setCountry(value)
    setState('saving')
    const res = await fetch(`/api/students/${studentId}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ country: value || null }),
    })
    setState(res.ok ? 'saved' : 'error')
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="student-country" className="text-sm font-semibold text-[#0B1220]">
        Country
      </label>
      <select
        id="student-country"
        value={country}
        disabled={state === 'saving'}
        onChange={(e) => save(e.target.value)}
        className="h-11 rounded-xl border border-[#D0D5DD] bg-white px-3 text-[15px] text-[#0B1220] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2B44E8]"
      >
        <option value="">Choose your country</option>
        {options.map((o) => (
          <option key={o.code} value={o.code}>
            {o.name}
          </option>
        ))}
      </select>
      <span aria-live="polite" className="text-[13px] text-[#475467]">
        {state === 'saving' ? 'Saving...' : state === 'saved' ? 'Country saved.' : state === 'error' ? 'Could not save. Please try again.' : ''}
      </span>
    </div>
  )
}
