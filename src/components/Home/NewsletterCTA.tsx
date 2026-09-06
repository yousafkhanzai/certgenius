import React from 'react'
import RichText from '@/components/RichText'
import { FormBlock, type FormBlockType } from '@/blocks/Form/Component'

// The closing homepage section: heading/paragraph (editable from the "Home"
// page in admin, same as any other block) rendered against a navy gradient,
// with the newsletter signup form in a plain white card beside it - the
// card stays the form's normal light styling, so nothing about FormBlock
// itself needed to change to work here.
export const NewsletterCTA: React.FC<FormBlockType> = ({ introContent, ...formBlockProps }) => {
  return (
    <div className="container">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary/80 px-8 py-14 md:px-16 md:py-16 flex flex-col md:flex-row md:items-center md:justify-between gap-10">
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-chart-5/15"
          aria-hidden
        />
        <div className="relative max-w-md">
          {introContent && (
            <RichText
              className="[&_h2]:text-2xl [&_h2]:md:text-3xl [&_h2]:font-extrabold [&_h2]:tracking-tight [&_h2]:text-white [&_h2]:mb-3 [&_p]:text-white/80 [&_p]:leading-relaxed"
              data={introContent}
              enableGutter={false}
            />
          )}
        </div>
        <div className="relative w-full md:w-auto md:min-w-[380px] bg-white rounded-2xl shadow-xl">
          <FormBlock {...formBlockProps} enableIntro={false} />
        </div>
      </div>
    </div>
  )
}
