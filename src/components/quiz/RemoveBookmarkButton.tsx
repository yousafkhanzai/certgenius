'use client'

import { useRouter } from 'next/navigation'
import React, { useState } from 'react'

import { BookmarkIcon } from './ui'

export function RemoveBookmarkButton({ questionId }: { questionId: number }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true)
        await fetch('/api/quiz/bookmark', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ questionId, on: false }),
        }).catch(() => undefined)
        router.refresh()
      }}
      className="flex h-9 items-center gap-1.5 rounded-[10px] border border-[#D0D5DD] bg-white px-3 text-sm font-semibold text-[#344054] hover:border-[#B42318] hover:text-[#B42318] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2B44E8] disabled:opacity-60"
    >
      <BookmarkIcon size={15} fill="currentColor" />
      {busy ? 'Removing...' : 'Remove'}
    </button>
  )
}
