'use client'
import { cn } from '@/utilities/ui'
import useClickableCard from '@/utilities/useClickableCard'
import Link from 'next/link'
import React, { Fragment } from 'react'
import { ArrowRight, FileText } from 'lucide-react'

import type { Post } from '@/payload-types'

import { Media } from '@/components/Media'

export type CardPostData = Pick<Post, 'slug' | 'categories' | 'meta' | 'title'>

export const Card: React.FC<{
  alignItems?: 'center'
  className?: string
  doc?: CardPostData
  relationTo?: 'posts'
  showCategories?: boolean
  title?: string
}> = (props) => {
  const { card, link } = useClickableCard({})
  const { className, doc, relationTo, showCategories, title: titleFromProps } = props

  const { slug, categories, meta, title } = doc || {}
  const { description, image: metaImage } = meta || {}

  const hasCategories = categories && Array.isArray(categories) && categories.length > 0
  const titleToUse = titleFromProps || title
  const sanitizedDescription = description?.replace(/\s/g, ' ') // replace non-breaking space with white space
  const href = `/${relationTo}/${slug}`

  return (
    <article
      className={cn(
        'group rounded-2xl border border-border bg-card overflow-hidden shadow-sm hover:shadow-lg transition-shadow hover:cursor-pointer',
        className,
      )}
      ref={card.ref}
    >
      <div className="relative w-full aspect-[16/10] bg-accent">
        {!metaImage && (
          <div className="w-full h-full flex items-center justify-center">
            <FileText className="w-10 h-10 text-primary/40" strokeWidth={1.5} />
          </div>
        )}
        {metaImage && typeof metaImage !== 'string' && <Media resource={metaImage} size="33vw" />}
      </div>
      <div className="p-6">
        {showCategories && hasCategories && (
          <div className="uppercase text-xs font-bold tracking-wide text-muted-foreground mb-3">
            {categories?.map((category, index) => {
              if (typeof category === 'object') {
                const { title: titleFromCategory } = category

                const categoryTitle = titleFromCategory || 'Untitled category'

                const isLast = index === categories.length - 1

                return (
                  <Fragment key={index}>
                    {categoryTitle}
                    {!isLast && <Fragment>, &nbsp;</Fragment>}
                  </Fragment>
                )
              }

              return null
            })}
          </div>
        )}
        {titleToUse && (
          <h3 className="text-lg font-bold leading-snug mb-2">
            <Link className="not-prose" href={href} ref={link.ref}>
              {titleToUse}
            </Link>
          </h3>
        )}
        {description && (
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
            {sanitizedDescription}
          </p>
        )}
        <div className="flex items-center gap-1.5 text-sm font-semibold text-primary mt-4 group-hover:gap-2.5 transition-all">
          Read article
          <ArrowRight className="w-4 h-4" />
        </div>
      </div>
    </article>
  )
}
