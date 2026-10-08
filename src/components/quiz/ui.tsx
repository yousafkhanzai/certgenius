import Link from 'next/link'
import React from 'react'

// Small pieces shared by the quiz screens, drawn to match content/quiz-designs.
// Colours are the design tokens from the README (ink #0B1220, page #F6F7F9,
// primary #2B44E8, mint #7CF2B0, etc.).

type IconProps = { size?: number; className?: string; strokeWidth?: number; fill?: string }

const svg = (paths: React.ReactNode) =>
  function Icon({ size = 18, className, strokeWidth = 2, fill = 'none' }: IconProps) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={fill}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
      >
        {paths}
      </svg>
    )
  }

export const CheckIcon = svg(<path d="M20 6L9 17l-5-5" />)
export const XIcon = svg(
  <>
    <path d="M18 6L6 18" />
    <path d="M6 6l12 12" />
  </>,
)
export const TimerIcon = svg(
  <>
    <circle cx="12" cy="13" r="8" />
    <path d="M12 9v4l2 2" />
    <path d="M9 2h6" />
  </>,
)
export const BulbIcon = svg(
  <>
    <path d="M9 18h6" />
    <path d="M10 22h4" />
    <path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z" />
  </>,
)
export const BookmarkIcon = svg(<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />)
export const FlameIcon = svg(<path d="M12 2c1 4 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3-1-5.5 1-8.5z" />)
export const StarIcon = svg(<path d="M12 2l3 7h7l-5.5 4.5L18.5 21 12 16.5 5.5 21l2-7.5L2 9h7z" />)
export const ChevronLeft = svg(<path d="M15 18l-6-6 6-6" />)
export const ChevronRight = svg(<path d="M9 18l6-6-6-6" />)
export const ArrowRight = svg(
  <>
    <path d="M5 12h14" />
    <path d="M13 6l6 6-6 6" />
  </>,
)
export const CrossOutIcon = svg(
  <>
    <path d="M4 12h16" />
    <path d="M9 6c-2 0-3 1.5-3 3" />
    <path d="M15 18c2 0 3-1.5 3-3" />
  </>,
)
export const FlagIcon = svg(
  <>
    <path d="M4 22V4" />
    <path d="M4 4h12l-2 4 2 4H4" />
  </>,
)

export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-[9px] bg-[#0B1220] text-white"
      style={{ width: size, height: size }}
    >
      <CheckIcon size={Math.round(size * 0.56)} strokeWidth={2.4} />
    </span>
  )
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded-[5px] border border-b-2 border-[#D0D5DD] bg-white px-1.5 py-px font-mono text-[#0B1220]">
      {children}
    </kbd>
  )
}

export function QuizPage({ children }: { children: React.ReactNode }) {
  // Fixed light palette from the designs, whatever the site theme is.
  return (
    <div data-theme="light" className="min-h-screen bg-[#F6F7F9] font-sans text-[#0B1220] [color-scheme:light]">
      {children}
    </div>
  )
}

export const card = 'rounded-[20px] border border-[#E4E7EC] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.05)]'
export const primaryButton =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-[#2B44E8] px-6 font-bold text-white no-underline transition-colors hover:bg-[#1A2DB0] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2B44E8] disabled:cursor-not-allowed disabled:opacity-60'
export const secondaryButton =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-[#D0D5DD] bg-white px-5 font-semibold text-[#0B1220] no-underline transition-colors hover:bg-[#F6F7F9] hover:text-[#0B1220] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2B44E8] disabled:cursor-not-allowed disabled:opacity-60'

export function TextLink({ href, children, className = '' }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <Link href={href} className={`font-semibold text-[#2B44E8] no-underline hover:text-[#1A2DB0] ${className}`}>
      {children}
    </Link>
  )
}

export const levelLabel: Record<string, { label: string; className: string }> = {
  easy: { label: 'Easy', className: 'bg-[#ECFDF3] text-[#067647]' },
  medium: { label: 'Medium', className: 'bg-[#EEF1FF] text-[#2B44E8]' },
  hard: { label: 'Hard', className: 'bg-[#FFFAEB] text-[#93370D]' },
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const pad = (n: number) => String(n).padStart(2, '0')
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${pad(m)}:${pad(s % 60)}`
}
