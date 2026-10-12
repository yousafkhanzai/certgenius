import { formatDateTime } from 'src/utilities/formatDateTime'
import Link from 'next/link'
import React from 'react'

import type { Post } from '@/payload-types'

import { Media } from '@/components/Media'
import { formatAuthors } from '@/utilities/formatAuthors'

// Blog post (study guide) header: dark navy hero with breadcrumb, title,
// author and date. An optional hero image is shown underneath.
export const PostHero: React.FC<{
  post: Post
}> = ({ post }) => {
  const { heroImage, populatedAuthors, publishedAt, title } = post

  const hasAuthors =
    populatedAuthors && populatedAuthors.length > 0 && formatAuthors(populatedAuthors) !== ''

  return (
    <>
      <div className="bg-hero text-white">
        <div className="mx-auto flex max-w-[52rem] flex-col gap-5 px-4 py-12 sm:px-6 lg:py-16">
          <nav aria-label="Breadcrumb" className="flex flex-wrap gap-2 text-sm text-hero-muted">
            <Link href="/" className="text-hero-muted no-underline hover:text-white">
              Home
            </Link>
            <span aria-hidden="true">/</span>
            <Link href="/posts" className="text-hero-muted no-underline hover:text-white">
              Study guides
            </Link>
          </nav>
          <h1 className="m-0 text-[30px] font-extrabold leading-[1.1] tracking-[-0.03em] sm:text-[44px]">{title}</h1>
          <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm text-hero-body">
            {hasAuthors && (
              <span>
                By <strong className="text-white">{formatAuthors(populatedAuthors)}</strong>
              </span>
            )}
            {publishedAt && (
              <span>
                Published <time dateTime={publishedAt}>{formatDateTime(publishedAt)}</time>
              </span>
            )}
          </div>
        </div>
      </div>
      {heroImage && typeof heroImage !== 'string' && typeof heroImage !== 'number' && (
        <div className="mx-auto max-w-[52rem] px-4 pt-8 sm:px-6">
          <Media priority imgClassName="rounded-[20px]" resource={heroImage} />
        </div>
      )}
    </>
  )
}
