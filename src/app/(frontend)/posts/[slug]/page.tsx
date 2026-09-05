import type { Metadata } from 'next'

import { RelatedPosts } from '@/blocks/RelatedPosts/Component'
import { PayloadRedirects } from '@/components/PayloadRedirects'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { draftMode } from 'next/headers'
import React, { cache } from 'react'
import RichText from '@/components/RichText'

import type { Post } from '@/payload-types'

import { PostHero } from '@/heros/PostHero'
import { generateMeta } from '@/utilities/generateMeta'
import PageClient from './page.client'
import { LivePreviewListener } from '@/components/LivePreviewListener'
import { JsonLd } from '@/components/JsonLd'
import { articleSchema, breadcrumbSchema } from '@/utilities/schema'

export async function generateStaticParams() {
  const payload = await getPayload({ config: configPromise })
  const posts = await payload.find({
    collection: 'posts',
    draft: false,
    limit: 1000,
    overrideAccess: false,
    pagination: false,
    select: {
      slug: true,
    },
  })

  const params = posts.docs.map(({ slug }) => {
    return { slug }
  })

  return params
}

type Args = {
  params: Promise<{
    slug?: string
  }>
}

export default async function Post({ params: paramsPromise }: Args) {
  const { isEnabled: draft } = await draftMode()
  const { slug = '' } = await paramsPromise
  // Decode to support slugs with special characters
  const decodedSlug = decodeURIComponent(slug)
  const url = '/posts/' + decodedSlug
  const post = await queryPostBySlug({ slug: decodedSlug })

  if (!post) return <PayloadRedirects url={url} />

  const metaImage =
    post.meta?.image && typeof post.meta.image === 'object' ? post.meta.image.url : undefined

  return (
    <article className="pt-16 pb-16">
      <PageClient />
      <JsonLd
        data={articleSchema({
          title: post.title,
          slug: post.slug,
          description: post.meta?.description,
          publishedAt: post.publishedAt,
          updatedAt: post.updatedAt,
          imageUrl: metaImage,
          authorNames: post.populatedAuthors?.map((a) => a.name).filter((n): n is string => !!n),
        })}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Blog', path: '/posts' },
          { name: post.title, path: `/posts/${post.slug}` },
        ])}
      />

      {/* Allows redirects for valid pages too */}
      <PayloadRedirects disableNotFound url={url} />

      {draft && <LivePreviewListener />}

      <PostHero post={post} />

      {/*
        Reading-column layout: the post text stays in a fixed-width centered
        column (readable, wraps normally like a normal article) with two
        empty rails on either side reserved for ads. The rails only appear
        on wide screens (xl and up, 1280px+) since there's no room for them
        on tablet/mobile - the content column just uses the full width there.
      */}
      <div className="pt-8 pb-8">
        <div className="mx-auto grid w-full max-w-[1400px] grid-cols-1 gap-8 px-4 xl:grid-cols-[minmax(160px,1fr)_minmax(0,48rem)_minmax(160px,1fr)] xl:px-8">
          <aside className="hidden xl:block" aria-hidden="true" />

          <div className="min-w-0">
            <RichText
              className="mx-auto max-w-none break-words"
              data={post.content}
              enableGutter={false}
            />
            {post.relatedPosts && post.relatedPosts.length > 0 && (
              <RelatedPosts
                className="mt-12"
                docs={post.relatedPosts.filter((post) => typeof post === 'object')}
              />
            )}
          </div>

          <aside className="hidden xl:block" aria-hidden="true" />
        </div>
      </div>
    </article>
  )
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { slug = '' } = await paramsPromise
  // Decode to support slugs with special characters
  const decodedSlug = decodeURIComponent(slug)
  const post = await queryPostBySlug({ slug: decodedSlug })

  return generateMeta({ doc: post })
}

const queryPostBySlug = cache(async ({ slug }: { slug: string }) => {
  const { isEnabled: draft } = await draftMode()

  const payload = await getPayload({ config: configPromise })

  const result = await payload.find({
    collection: 'posts',
    draft,
    limit: 1,
    overrideAccess: draft,
    pagination: false,
    where: {
      slug: {
        equals: slug,
      },
    },
  })

  return result.docs?.[0] || null
})
