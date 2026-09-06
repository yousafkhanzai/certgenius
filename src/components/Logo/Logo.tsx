import React from 'react'

import { cn } from '@/utilities/ui'

interface Props {
  className?: string
}

// Text wordmark: "Cert" in the current text color (so it adapts to whatever
// background it's placed on - inherit from a parent like the dark footer, or
// default to --foreground on a normal page background) and "Genius" in the
// brand's primary blue, for a bit of visual distinction without needing an
// image asset.
export const Logo = ({ className }: Props) => {
  return (
    <span
      className={cn(
        'inline-flex items-baseline text-xl font-bold tracking-tight leading-none text-foreground',
        className,
      )}
    >
      Cert
      <span className="text-primary">Genius</span>
    </span>
  )
}
