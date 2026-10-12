import { convertMarkdownToLexical, editorConfigFactory } from '@payloadcms/richtext-lexical'
import type { PayloadRequest } from 'payload'

import type { RowResult } from './columns'

// Study-guide blog import. Content rule: every domain of a certification has
// ONE blog that covers all of that domain's questions. A blog is a Markdown
// file that starts with a small header:
//
//   ---
//   title: "Solidity Fundamentals for the Certified Ethereum Developer Exam"
//   slug: solidity-fundamentals
//   certification: certified-ethereum-developer
//   domain: Solidity Programming Language
//   excerpt: "One or two sentences shown in Google and on listing cards."
//   ---
//
// Importing creates (or updates) the blog post and attaches it to that domain.

export type BlogFile = { name: string; text: string }
export type BlogImportOptions = { publish: boolean; updateExisting: boolean }

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
export const MAX_BLOG_FILES = 25
export const MAX_BLOG_BYTES = 300_000

type Parsed = {
  title: string
  slug: string
  certification: string
  domain: string
  excerpt: string
  videoUrl: string
  markdown: string
}

export function parseBlogFile(text: string): { blog?: Parsed; problems: string[] } {
  const raw = text.replace(/^﻿/, '').replace(/\r\n/g, '\n')
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
  if (!m) {
    return {
      problems: ['the file must start with a header between two --- lines (title, slug, certification, domain, excerpt)'],
    }
  }
  const fm: Record<string, string> = {}
  for (const line of m[1].split('\n')) {
    const i = line.indexOf(':')
    if (i === -1) continue
    fm[line.slice(0, i).trim().toLowerCase()] = line
      .slice(i + 1)
      .trim()
      .replace(/^["'](.*)["']$/, '$1')
  }
  const blog: Parsed = {
    title: fm.title || '',
    slug: fm.slug || '',
    certification: fm.certification || '',
    domain: fm.domain || '',
    excerpt: fm.excerpt || '',
    videoUrl: fm.videourl || '',
    markdown: m[2].trim(),
  }
  const problems: string[] = []
  if (!blog.title) problems.push('title is missing')
  if (!blog.slug) problems.push('slug is missing')
  else if (!SLUG_PATTERN.test(blog.slug)) problems.push(`slug "${blog.slug}" may only use lowercase letters, numbers and single hyphens`)
  if (!blog.certification) problems.push('certification is missing (use the certification slug)')
  if (!blog.domain) problems.push('domain is missing')
  if (blog.markdown.length < 200) problems.push('the blog text is missing or very short')
  if (blog.title.length > 200) problems.push('title is longer than 200 characters')
  return { blog, problems }
}

type Checked = RowResult & {
  blog?: Parsed
  certId?: number
  existingPostId?: number
}

export async function checkBlogFiles(req: PayloadRequest, files: BlogFile[]): Promise<Checked[]> {
  const { payload } = req
  const parsed = files.map((f) => ({ file: f, ...parseBlogFile(f.text) }))

  const certSlugs = Array.from(new Set(parsed.map((p) => p.blog?.certification).filter(Boolean))) as string[]
  const certs = certSlugs.length
    ? (
        await payload.find({
          collection: 'certifications',
          where: { slug: { in: certSlugs } },
          draft: true,
          depth: 0,
          limit: certSlugs.length,
          overrideAccess: true,
        })
      ).docs
    : []
  const postSlugs = Array.from(new Set(parsed.map((p) => p.blog?.slug).filter(Boolean))) as string[]
  const posts = postSlugs.length
    ? (
        await payload.find({
          collection: 'posts',
          where: { slug: { in: postSlugs } },
          draft: true,
          depth: 0,
          limit: postSlugs.length,
          overrideAccess: true,
          select: { slug: true },
        })
      ).docs
    : []
  const postBySlug = new Map(posts.map((p) => [p.slug, Number(p.id)]))

  const seenSlugs = new Set<string>()
  const seenDomains = new Set<string>()
  return parsed.map(({ file, blog, problems }, i) => {
    const row = i + 1
    const label = blog?.title ? `${blog.title} (${file.name})` : file.name
    const issues = [...problems]
    let certId: number | undefined
    if (blog?.certification) {
      const cert = certs.find((c) => c.slug === blog.certification)
      if (!cert) issues.push(`unknown certification "${blog.certification}"`)
      else {
        certId = Number(cert.id)
        const names = (cert.domains || []).map((d) => d.name)
        if (blog.domain && !names.includes(blog.domain)) {
          issues.push(
            names.length
              ? `domain "${blog.domain}" is not one of this certification's domains (${names.join(' | ')})`
              : `this certification has no domains yet - add its domains first`,
          )
        }
      }
    }
    if (issues.length || !blog) return { row, status: 'invalid', problems: issues, label }

    const domainKey = `${blog.certification}|${blog.domain}`
    if (seenSlugs.has(blog.slug)) return { row, status: 'duplicate', problems: ['another file in this upload has the same slug'], label }
    if (seenDomains.has(domainKey)) {
      return { row, status: 'duplicate', problems: ['another file in this upload is for the same domain (one blog per domain)'], label }
    }
    seenSlugs.add(blog.slug)
    seenDomains.add(domainKey)

    const notes: string[] = []
    if (blog.videoUrl) notes.push('videoUrl is kept for later: the blog video field arrives with the blog template')
    const existingPostId = postBySlug.get(blog.slug)
    if (existingPostId !== undefined) {
      return { row, status: 'exists', problems: notes, label, key: blog.slug, blog, certId, existingPostId }
    }
    return { row, status: 'valid', problems: notes, label, key: blog.slug, blog, certId }
  })
}

export async function importBlogFiles(req: PayloadRequest, files: BlogFile[], options: BlogImportOptions): Promise<RowResult[]> {
  const { payload } = req
  const checked = await checkBlogFiles(req, files)
  const editorConfig = await editorConfigFactory.default({ config: payload.config })

  for (const r of checked) {
    if (!r.blog || !r.certId) continue
    const isNew = r.status === 'valid'
    if (!isNew && !(r.status === 'exists' && options.updateExisting)) continue
    try {
      const data = {
        title: r.blog.title,
        slug: r.blog.slug,
        content: convertMarkdownToLexical({ editorConfig, markdown: r.blog.markdown }),
        meta: { title: r.blog.title, description: r.blog.excerpt },
      }
      const post = isNew
        ? await payload.create({
            collection: 'posts',
            data: {
              ...data,
              _status: options.publish ? 'published' : 'draft',
              ...(options.publish ? { publishedAt: new Date().toISOString() } : {}),
              ...(req.user ? { authors: [req.user.id] } : {}),
            },
            draft: !options.publish,
            overrideAccess: true,
            req,
          })
        : await payload.update({
            collection: 'posts',
            id: r.existingPostId as number,
            data: options.publish ? { ...data, _status: 'published' } : data,
            draft: !options.publish,
            overrideAccess: true,
            req,
          })

      // Attach the blog to its domain (one blog per domain).
      const cert = await payload.findByID({ collection: 'certifications', id: r.certId, draft: true, depth: 0, overrideAccess: true })
      const domains = (cert.domains || []).map((d) => ({
        id: d.id,
        name: d.name,
        weight: d.weight,
        studyGuide: d.name === r.blog?.domain ? post.id : typeof d.studyGuide === 'object' ? d.studyGuide?.id : d.studyGuide,
      }))
      await payload.update({
        collection: 'certifications',
        id: r.certId,
        data: { domains },
        // Keep a draft certification a draft; a published one stays published.
        draft: cert._status !== 'published',
        overrideAccess: true,
        req,
      })

      r.status = isNew ? 'imported' : 'updated'
      r.problems.push(
        `${options.publish ? 'published' : 'saved as a draft'} and attached to "${r.blog.domain}"${
          options.publish ? '' : ' - publish it under Blog posts to make it visible'
        }`,
      )
    } catch (err) {
      r.status = 'invalid'
      r.problems.push(err instanceof Error ? err.message : 'could not be saved')
    }
  }
  return checked.map(({ blog: _blog, certId: _certId, existingPostId: _id, ...rest }) => rest)
}
