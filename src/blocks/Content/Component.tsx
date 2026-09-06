import { cn } from '@/utilities/ui'
import React from 'react'
import RichText from '@/components/RichText'
import { CheckCircle2, Target, RefreshCw, type LucideIcon } from 'lucide-react'

import type { ContentBlock as ContentBlockProps } from '@/payload-types'

import { CMSLink } from '../../components/Link'

const colsSpanClasses = {
  full: '12',
  half: '6',
  oneThird: '4',
  twoThirds: '8',
}

// Columns don't carry an icon field in the CMS - cycling a small fixed set
// keeps every value-prop card visually consistent without a schema change.
const icons: LucideIcon[] = [CheckCircle2, Target, RefreshCw]

export const ContentBlock: React.FC<ContentBlockProps> = (props) => {
  const { columns } = props

  // The "3 even columns, no link" shape is the homepage value-prop layout -
  // give it the elevated icon-card treatment. Anything else (links, uneven
  // widths) falls back to the plain layout so this stays safe for other pages.
  const isValuePropGrid =
    columns?.length === 3 && columns.every((col) => col.size === 'oneThird' && !col.enableLink)

  if (isValuePropGrid) {
    return (
      <div className="container py-16 md:py-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {columns!.map((col, index) => {
            const Icon = icons[index % icons.length]!

            return (
              <div
                key={index}
                className="rounded-2xl border border-border bg-card p-8 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center mb-5">
                  <Icon className="w-6 h-6 text-primary" strokeWidth={2} />
                </div>
                {col.richText && (
                  <RichText
                    className="[&_h3]:text-lg [&_h3]:font-bold [&_h3]:mb-2 [&_p]:text-sm [&_p]:leading-relaxed [&_p]:text-muted-foreground"
                    data={col.richText}
                    enableGutter={false}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="container my-16">
      <div className="grid grid-cols-4 lg:grid-cols-12 gap-y-8 gap-x-16">
        {columns &&
          columns.length > 0 &&
          columns.map((col, index) => {
            const { enableLink, link, richText, size } = col

            return (
              <div
                className={cn(`col-span-4 lg:col-span-${colsSpanClasses[size!]}`, {
                  'md:col-span-2': size !== 'full',
                })}
                key={index}
              >
                {richText && <RichText data={richText} enableGutter={false} />}

                {enableLink && <CMSLink {...link} />}
              </div>
            )
          })}
      </div>
    </div>
  )
}
