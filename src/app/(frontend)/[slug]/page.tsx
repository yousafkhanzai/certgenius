import type { Metadata } from 'next'

import { PayloadRedirects } from '@/components/PayloadRedirects'
import configPromise from '@payload-config'
import { getPayload, type RequiredDataFromCollectionSlug } from 'payload'
import { draftMode } from 'next/headers'
import React, { cache } from 'react'
import { homeStatic } from '@/endpoints/seed/home-static'

import { RenderBlocks } from '@/blocks/RenderBlocks'
import { RenderHero } from '@/heros/RenderHero'
import { generateMeta } from '@/utilities/generateMeta'
import PageClient from './page.client'
import { LivePreviewListener } from '@/components/LivePreviewListener'
import { TrustBar } from '@/components/Home/TrustBar'
import { FeaturedCertifications } from '@/components/Home/FeaturedCertifications'
import { NewsletterCTA } from '@/components/Home/NewsletterCTA'
import { CallToActionBlock } from '@/blocks/CallToAction/Component'
import { ContentBlock } from '@/blocks/Content/Component'
import type {
  CallToActionBlock as CTABlockProps,
  ContentBlock as ContentBlockProps,
} from '@/payload-types'
import type { FormBlockType } from '@/blocks/Form/Component'

export async function generateStaticParams() {
  const payload = await getPayload({ config: configPromise })
  const pages = await payload.find({
    collection: 'pages',
    draft: false,
    limit: 1000,
    overrideAccess: false,
    pagination: false,
    select: {
      slug: true,
    },
  })

  const params = pages.docs
    ?.filter((doc) => {
      return doc.slug !== 'home'
    })
    .map(({ slug }) => {
      return { slug }
    })

  return params
}

type Args = {
  params: Promise<{
    slug?: string
  }>
}

export default async function Page({ params: paramsPromise }: Args) {
  const { isEnabled: draft } = await draftMode()
  const { slug = 'home' } = await paramsPromise
  // Decode to support slugs with special characters
  const decodedSlug = decodeURIComponent(slug)
  const url = '/' + decodedSlug
  let page: RequiredDataFromCollectionSlug<'pages'> | null

  page = await queryPageBySlug({
    slug: decodedSlug,
  })

  // Remove this code once your website is seeded
  if (!page && slug === 'home') {
    page = homeStatic
  }

  if (!page) {
    return <PayloadRedirects url={url} />
  }

  const { hero, layout } = page
  const isHome = decodedSlug === 'home'

  return (
    <article className={isHome ? '' : 'pt-16 pb-24'}>
      <PageClient />
      {/* Allows redirects for valid pages too */}
      <PayloadRedirects disableNotFound url={url} />

      {draft && <LivePreviewListener />}

      <RenderHero {...hero} />
      {isHome ? <HomeLayout layout={layout} /> : <RenderBlocks blocks={layout} />}
    </article>
  )
}

// The homepage's own layout (hero CTA, feature columns, newsletter CTA, blog
// archive - see src/seed/run.ts) gets two extra sections woven in between the
// CMS-authored blocks: a trust bar after the hero, and the live certifications
// grid after the value props. Those two sections aren't part of the Pages
// block system (see src/components/Home for why), so they can't be reordered
// from admin - if the block order in "Home" is ever changed there, this falls
// back to rendering everything in the plain block order with both sections
// appended at the end, rather than guessing a new position.
const HomeLayout: React.FC<{ layout: RequiredDataFromCollectionSlug<'pages'>['layout'] }> = ({
  layout,
}) => {
  const blocks = layout || []
  const [heroBlock, featuresBlock, newsletterBlock, ...rest] = blocks
  const matchesExpectedShape =
    heroBlock?.blockType === 'cta' &&
    featuresBlock?.blockType === 'content' &&
    newsletterBlock?.blockType === 'formBlock'

  if (!matchesExpectedShape) {
    return (
      <>
        <RenderBlocks blocks={blocks} />
        <TrustBar />
        <FeaturedCertifications />
      </>
    )
  }

  return (
    <>
      {/* Rendered directly (not via RenderBlocks) so these sit flush against
          the trust bar / certifications grid instead of picking up
          RenderBlocks' generic my-16 spacing - each already manages its own
          vertical padding for a full-bleed hero, card grid, and gradient
          band. Casts are safe: matchesExpectedShape above confirms these
          blockTypes. */}
      <CallToActionBlock {...(heroBlock as unknown as CTABlockProps)} />
      <TrustBar />
      <ContentBlock {...(featuresBlock as unknown as ContentBlockProps)} />
      <FeaturedCertifications />
      <div className="my-16">
        <NewsletterCTA {...(newsletterBlock as unknown as FormBlockType)} />
      </div>
      <RenderBlocks blocks={rest} />
    </>
  )
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { slug = 'home' } = await paramsPromise
  // Decode to support slugs with special characters
  const decodedSlug = decodeURIComponent(slug)
  const page = await queryPageBySlug({
    slug: decodedSlug,
  })

  return generateMeta({ doc: page })
}

const queryPageBySlug = cache(async ({ slug }: { slug: string }) => {
  const { isEnabled: draft } = await draftMode()

  const payload = await getPayload({ config: configPromise })

  const result = await payload.find({
    collection: 'pages',
    draft,
    limit: 1,
    pagination: false,
    overrideAccess: draft,
    where: {
      slug: {
        equals: slug,
      },
    },
  })

  return result.docs?.[0] || null
})
