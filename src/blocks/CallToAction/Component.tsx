import React from 'react'

import type { CallToActionBlock as CTABlockProps } from '@/payload-types'

import RichText from '@/components/RichText'
import { CMSLink } from '@/components/Link'
import { cn } from '@/utilities/ui'

// A page's very first CTA block carries the H1 (see src/seed/lexical.ts's
// `heading(text, 'h1')`) and doubles as that page's hero. Any other CTA block
// renders as a smaller closing band. Detecting this from the rich text itself
// (rather than a dedicated field) avoids a schema change/migration for a
// purely visual distinction.
const hasH1 = (richText: CTABlockProps['richText']) =>
  (richText?.root?.children || []).some(
    (node) => (node as { type?: unknown }).type === 'heading' && (node as { tag?: unknown }).tag === 'h1',
  )

export const CallToActionBlock: React.FC<CTABlockProps> = ({ links, richText }) => {
  const isHero = hasH1(richText)

  if (isHero) {
    return (
      <div className="bg-gradient-to-b from-secondary to-background">
        <div className="container py-16 md:py-24">
          <div className="max-w-2xl">
            {richText && (
              <RichText
                className="[&_h1]:text-4xl [&_h1]:sm:text-5xl [&_h1]:lg:text-[3.5rem] [&_h1]:font-extrabold [&_h1]:tracking-tight [&_h1]:leading-[1.08] [&_h1]:mb-5 [&_p]:text-lg [&_p]:text-muted-foreground [&_p]:leading-relaxed [&_p]:max-w-xl"
                data={richText}
                enableGutter={false}
              />
            )}
            {links && links.length > 0 && (
              <div className="flex flex-wrap gap-3 mt-8">
                {links.map(({ link }, i) => (
                  <CMSLink key={i} size="lg" {...link} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <div
        className={cn(
          'relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary/80',
          'px-8 py-14 md:px-16 md:py-16 flex flex-col md:flex-row md:items-center md:justify-between gap-8',
        )}
      >
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-chart-5/15"
          aria-hidden
        />
        <div className="relative max-w-lg">
          {richText && (
            <RichText
              className="[&_h2]:text-2xl [&_h2]:md:text-3xl [&_h2]:font-extrabold [&_h2]:tracking-tight [&_h2]:text-primary-foreground [&_h2]:mb-3 [&_p]:text-primary-foreground/80 [&_p]:leading-relaxed"
              data={richText}
              enableGutter={false}
            />
          )}
        </div>
        {links && links.length > 0 && (
          <div className="relative flex flex-wrap gap-3 shrink-0">
            {links.map(({ link }, i) => (
              <CMSLink
                key={i}
                size="lg"
                className="bg-chart-5 text-[oklch(20%_0.05_70deg)] hover:bg-chart-5/90 border-0 shadow-lg"
                {...link}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
