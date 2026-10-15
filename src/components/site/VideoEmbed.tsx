'use client'

import { Play } from 'lucide-react'
import React, { useState } from 'react'

// A YouTube video that loads only when it is played: until then it is just a
// picture, so the page stays fast and YouTube sets nothing in the browser.
// Uses youtube-nocookie.com (YouTube's privacy-enhanced mode).
export function VideoEmbed({ id, title }: { id: string; title: string }) {
  const [playing, setPlaying] = useState(false)

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-[20px] bg-[#0B1220] shadow-[0_8px_24px_rgba(16,24,40,0.12)]">
      {playing ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="absolute inset-0 h-full w-full border-0"
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          className="group absolute inset-0 flex h-full w-full items-center justify-center border-0 bg-transparent p-0 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-[-4px] focus-visible:outline-mint"
          aria-label={`Play video: ${title}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover opacity-80 transition-opacity group-hover:opacity-100"
          />
          <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-transform group-hover:scale-105">
            <Play className="ml-1 h-7 w-7" fill="currentColor" aria-hidden="true" />
          </span>
        </button>
      )}
    </div>
  )
}
