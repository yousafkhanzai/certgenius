import type { Metadata } from 'next/types'

import { CollectionArchive } from '@/components/CollectionArchive'
import { PageRange } from '@/components/PageRange'
import { Pagination } from '@/components/Pagination'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'
import PageClient from './page.client'

export const dynamic = 'force-static'
export const revalidate = 600

export default async function Page() {
  const payload = await getPayload({ config: configPromise })

  const posts = await payload.find({
    collection: 'posts',
    depth: 1,
    limit: 12,
    overrideAccess: false,
    select: {
      title: true,
      slug: true,
      categories: true,
      meta: true,
    },
  })

  return (
    <div className="pb-24">
      <PageClient />
      <div className="mb-12 bg-hero text-white">
        <div className="container flex flex-col gap-3 py-14">
          <h1 className="m-0 text-[36px] font-extrabold leading-tight tracking-[-0.03em] sm:text-[48px]">Study guides</h1>
          <p className="m-0 max-w-[640px] text-lg leading-relaxed text-hero-body">
            One guide for every exam domain, covering the practice questions in that domain.
          </p>
        </div>
      </div>

      <div className="container mb-8">
        <PageRange
          collection="posts"
          currentPage={posts.page}
          limit={12}
          totalDocs={posts.totalDocs}
        />
      </div>

      <CollectionArchive posts={posts.docs} />

      <div className="container">
        {posts.totalPages > 1 && posts.page && (
          <Pagination page={posts.page} totalPages={posts.totalPages} />
        )}
      </div>
    </div>
  )
}

export function generateMetadata(): Metadata {
  return {
    title: 'Study guides for IT certification exams | CertGenius',
    description: 'Free study guides for IT certification exams: one guide per exam domain, covering the practice questions in it.',
  }
}
