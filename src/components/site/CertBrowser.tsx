'use client'

import { Search, X } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import React, { useEffect, useMemo, useState } from 'react'

import { CertCardView } from '@/components/Home/CertCardView'
import type { CertCard } from '@/site/data'

type Option = { value: string; label: string }

// Search and filter for the certifications page: search by name or vendor,
// filter by category and vendor. Filters are kept in the address bar
// (?q=...&category=...&vendor=...) so a filtered view can be shared or bookmarked.
export function CertBrowser({ certs, categories, vendors }: { certs: CertCard[]; categories: Option[]; vendors: string[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [q, setQ] = useState(params.get('q') || '')
  const [category, setCategory] = useState(params.get('category') || '')
  const [vendor, setVendor] = useState(params.get('vendor') || '')

  // Follow links that change the filters (e.g. a category link in the footer).
  useEffect(() => {
    setQ(params.get('q') || '')
    setCategory(params.get('category') || '')
    setVendor(params.get('vendor') || '')
  }, [params])

  const update = (next: { q?: string; category?: string; vendor?: string }) => {
    const state = { q, category, vendor, ...next }
    if (next.q !== undefined) setQ(next.q)
    if (next.category !== undefined) setCategory(next.category)
    if (next.vendor !== undefined) setVendor(next.vendor)
    const search = new URLSearchParams()
    if (state.q.trim()) search.set('q', state.q.trim())
    if (state.category) search.set('category', state.category)
    if (state.vendor) search.set('vendor', state.vendor)
    const qs = search.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return certs.filter(
      (c) =>
        (!category || c.category === category) &&
        (!vendor || c.vendor === vendor) &&
        (!needle || c.title.toLowerCase().includes(needle) || (c.vendor || '').toLowerCase().includes(needle)),
    )
  }, [certs, q, category, vendor])

  const filtered = Boolean(q.trim() || category || vendor)
  const control =
    'h-12 rounded-xl border border-input bg-card px-3.5 text-[15px] text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring'

  return (
    <div className="flex flex-col gap-8">
      <form
        role="search"
        aria-label="Find a certification"
        onSubmit={(e) => e.preventDefault()}
        className="grid gap-3 rounded-[20px] border border-border bg-card p-4 sm:p-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
      >
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-body">Search by name or vendor</span>
          <span className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              type="search"
              value={q}
              onChange={(e) => update({ q: e.target.value })}
              placeholder="e.g. Security+ or Microsoft"
              className={`${control} w-full pl-10`}
            />
          </span>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-body">Category</span>
          <select value={category} onChange={(e) => update({ category: e.target.value })} className={control}>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-body">Vendor</span>
          <select value={vendor} onChange={(e) => update({ vendor: e.target.value })} className={control}>
            <option value="">All vendors</option>
            {vendors.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end">
          <button
            type="button"
            disabled={!filtered}
            onClick={() => update({ q: '', category: '', vendor: '' })}
            className="flex h-12 items-center gap-1.5 rounded-xl border border-input px-4 text-[15px] font-semibold text-foreground hover:border-primary disabled:opacity-50"
          >
            <X className="h-4 w-4" aria-hidden="true" />
            Clear
          </button>
        </div>
      </form>

      <p className="m-0 text-[15px] text-muted-foreground" aria-live="polite">
        {results.length === certs.length
          ? `${certs.length} certification${certs.length === 1 ? '' : 's'}`
          : `${results.length} of ${certs.length} certification${certs.length === 1 ? '' : 's'}`}
      </p>

      {results.length === 0 ? (
        <div className="rounded-[20px] border border-dashed border-border p-8 text-center text-muted-foreground">
          No certification matches. Try a different name or vendor, or clear the filters.
        </div>
      ) : (
        <div className="grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(min(100%,340px),1fr))]">
          {results.map((c) => (
            <CertCardView key={c.id} cert={c} />
          ))}
        </div>
      )}
    </div>
  )
}
