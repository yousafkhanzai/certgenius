'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'

// A 3x3 pattern lock. Draw across the dots with a finger or mouse, or press
// the dots one at a time (keyboard works too) and then press "Done".
// The pattern is reported as the order of the dots, numbered 0-8.

export const PATTERN_MIN = 5

const DOTS = Array.from({ length: 9 }, (_, i) => ({ i, x: 50 + (i % 3) * 100, y: 50 + Math.floor(i / 3) * 100 }))

export function PatternPad({
  onComplete,
  disabled = false,
  resetKey = 0,
}: {
  onComplete: (pattern: string) => void
  disabled?: boolean
  resetKey?: number
}) {
  const [picked, setPicked] = useState<number[]>([])
  const pickedRef = useRef<number[]>([])
  const dragging = useRef(false)
  const box = useRef<HTMLDivElement>(null)

  const update = (next: number[]) => {
    pickedRef.current = next
    setPicked(next)
  }

  useEffect(() => update([]), [resetKey])

  const add = useCallback((i: number) => {
    if (!pickedRef.current.includes(i)) update([...pickedRef.current, i])
  }, [])

  const finish = useCallback(() => {
    const pattern = pickedRef.current.join('')
    if (pattern.length >= PATTERN_MIN) onComplete(pattern)
  }, [onComplete])

  const dotAt = (clientX: number, clientY: number): number | null => {
    const rect = box.current?.getBoundingClientRect()
    if (!rect) return null
    const x = ((clientX - rect.left) / rect.width) * 300
    const y = ((clientY - rect.top) / rect.height) * 300
    const hit = DOTS.find((d) => Math.hypot(d.x - x, d.y - y) < 34)
    return hit ? hit.i : null
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (disabled) return
    const i = dotAt(e.clientX, e.clientY)
    if (i === null) return
    dragging.current = true
    add(i)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current || disabled) return
    const i = dotAt(e.clientX, e.clientY)
    if (i !== null) add(i)
  }
  const onPointerUp = () => {
    if (!dragging.current) return
    dragging.current = false
    // A drag across several dots finishes on release; single presses wait for "Done".
    if (pickedRef.current.length >= PATTERN_MIN) finish()
  }

  const line = picked.map((i) => `${DOTS[i].x},${DOTS[i].y}`).join(' ')
  const short = picked.length > 0 && picked.length < PATTERN_MIN

  return (
    <div style={{ width: '100%', maxWidth: 280, margin: '0 auto' }}>
      <div
        ref={box}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '1 / 1',
          touchAction: 'none',
          userSelect: 'none',
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <svg viewBox="0 0 300 300" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} aria-hidden>
          <polyline points={line} fill="none" stroke="#2B44E8" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {DOTS.map((d) => {
          const on = picked.includes(d.i)
          return (
            <button
              key={d.i}
              type="button"
              disabled={disabled}
              aria-label={`Dot ${d.i + 1} of 9${on ? ', selected' : ''}`}
              aria-pressed={on}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  add(d.i)
                }
              }}
              style={{
                position: 'absolute',
                left: `${(d.x / 300) * 100}%`,
                top: `${(d.y / 300) * 100}%`,
                width: '18%',
                aspectRatio: '1 / 1',
                transform: 'translate(-50%, -50%)',
                borderRadius: '50%',
                border: `2px solid ${on ? '#2B44E8' : '#98A2B3'}`,
                background: on ? '#2B44E8' : 'transparent',
                boxShadow: on ? '0 0 0 6px rgba(43, 68, 232, 0.25)' : 'none',
                cursor: disabled ? 'default' : 'pointer',
                padding: 0,
              }}
            />
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12 }}>
        <button
          type="button"
          onClick={() => update([])}
          disabled={disabled || picked.length === 0}
          style={smallButton(false, disabled || picked.length === 0)}
        >
          Clear
        </button>
        <button
          type="button"
          onClick={finish}
          disabled={disabled || picked.length < PATTERN_MIN}
          style={smallButton(true, disabled || picked.length < PATTERN_MIN)}
        >
          Done
        </button>
      </div>
      <p aria-live="polite" style={{ minHeight: 20, margin: '8px 0 0', fontSize: 13, textAlign: 'center', opacity: 0.8 }}>
        {short ? `Join at least ${PATTERN_MIN} dots (${picked.length} so far).` : ''}
      </p>
    </div>
  )
}

const smallButton = (primary: boolean, off: boolean): React.CSSProperties => ({
  padding: '8px 18px',
  borderRadius: 10,
  fontSize: 14,
  fontWeight: 600,
  border: primary ? '1px solid #2B44E8' : '1px solid #98A2B3',
  background: primary ? '#2B44E8' : 'transparent',
  color: primary ? '#FFFFFF' : 'inherit',
  opacity: off ? 0.45 : 1,
  cursor: off ? 'default' : 'pointer',
})
