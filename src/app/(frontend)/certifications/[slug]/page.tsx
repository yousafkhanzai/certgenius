import type { Metadata } from 'next'

import configPromise from '@payload-config'
import { draftMode } from 'next/headers'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import React, { cache } from 'react'

import { AFFILIATE_TYPES, CERT_CATEGORIES, CERT_STATUSES } from '@/collections/Certifications/options'
import { CertCardView } from '@/components/Home/CertCardView'
import { JsonLd } from '@/components/JsonLd'
import RichText from '@/components/RichText'
import type { Certification, Post } from '@/payload-types'
import { domainQuestionCounts, feedbackFor, guestQuestionIds, publicQuestions } from '@/quiz/server'
import { listedCertifications } from '@/site/data'
import { categoryHref } from '@/site/taxonomy'
import { getServerSideURL } from '@/utilities/getURL'
import { postHeadings } from '@/utilities/headings'
import { breadcrumbSchema, courseSchema, quizSchema } from '@/utilities/schema'

// Rebuilt from live data every 10 minutes (question counts, new study guides).
export const revalidate = 600

export async function generateStaticParams() {
  const payload = await getPayload({ config: configPromise })
  const certifications = await payload.find({
    collection: 'certifications',
    draft: false,
    limit: 1000,
    overrideAccess: false,
    pagination: false,
    select: { slug: true },
  })
  return certifications.docs.map(({ slug }) => ({ slug }))
}

type Args = { params: Promise<{ slug?: string }> }

const container = 'mx-auto max-w-[1240px] px-4 sm:px-6'
const sectionClass = 'flex scroll-mt-32 flex-col gap-6'
const h2 = 'm-0 text-[26px] font-extrabold leading-tight tracking-[-0.03em] sm:text-[30px]'
const cardClass = 'rounded-[20px] border border-border bg-card p-6 shadow-[0_1px_2px_rgba(16,24,40,0.05)]'
const primaryBtn =
  'inline-flex h-12 items-center justify-center rounded-xl bg-primary px-5 text-[15px] font-bold text-primary-foreground no-underline hover:bg-primary-hover hover:text-primary-foreground'

const asPost = (v: unknown): Post | null => (v && typeof v === 'object' && 'slug' in v && (v as Post).slug ? (v as Post) : null)

export default async function CertificationPage({ params: paramsPromise }: Args) {
  const { slug = '' } = await paramsPromise
  const decodedSlug = decodeURIComponent(slug)
  const cert = await queryCertificationBySlug({ slug: decodedSlug })
  if (!cert) return notFound()

  const payload = await getPayload({ config: configPromise })
  const certId = Number(cert.id)
  const counts = await domainQuestionCounts(payload, certId)
  const bankSize = [...counts.values()].reduce((a, b) => a + b, 0)
  const quizUrl = `/certifications/${cert.slug}/quiz`
  const retired = cert.examStatus === 'retired'
  const replacement = cert.replacedBy && typeof cert.replacedBy === 'object' ? cert.replacedBy : null
  const category = CERT_CATEGORIES.find((c) => c.value === cert.certCategory)
  const statusLabel = CERT_STATUSES.find((s) => s.value === cert.examStatus)?.label || 'Active'
  const updated = new Date(cert.updatedAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  // Domains with their study guide (blog) and question counts.
  const domains = (cert.domains || []).map((d) => ({
    name: d.name,
    weight: d.weight ?? null,
    questions: counts.get(d.name) || 0,
    guide: asPost(d.studyGuide),
  }))
  const guides = domains.filter((d) => d.guide)
  // Topics: the section headings of each domain's study guide.
  const guideDocs = guides.length
    ? await payload.find({
        collection: 'posts',
        where: { id: { in: guides.map((d) => (d.guide as Post).id) } },
        depth: 0,
        limit: guides.length,
        overrideAccess: false,
        select: { slug: true, content: true, meta: true, title: true },
      })
    : { docs: [] }
  const guideBySlug = new Map(guideDocs.docs.map((p) => [p.slug, p]))
  const topics = guides
    .map((d) => ({
      domain: d.name,
      slug: (d.guide as Post).slug as string,
      items: postHeadings(guideBySlug.get((d.guide as Post).slug)?.content),
    }))
    .filter((t) => t.items.length > 0)

  // Three sample questions from the free questions, with their answers.
  const sampleIds = (await guestQuestionIds(payload, certId)).slice(0, 3)
  const samples = sampleIds.length ? await publicQuestions(payload, sampleIds, cert) : []
  const sampleAnswers = await feedbackFor(
    payload,
    sampleIds.map((id) => ({ questionId: id, chosen: 'A' as const })),
  )

  const related = (cert.relatedCertifications || []).filter((r): r is Certification => typeof r === 'object' && r !== null)
  const relatedCards = related.length
    ? (await listedCertifications()).filter((c) => related.some((r) => Number(r.id) === c.id))
    : []

  const about = cert.overview || cert.whoItsFor || cert.background || (cert.roles || []).length > 0
  const jump = [
    about && ['about', 'About'],
    domains.length > 0 && ['domains', 'Domains'],
    topics.length > 0 && ['topics', 'Topics'],
    samples.length > 0 && ['sample-questions', 'Sample questions'],
    guides.length > 0 && ['study-guides', 'Study guides'],
    (cert.studyPlan || []).length > 0 && ['study-plan', 'Study plan'],
    (cert.comparisonRows || []).length > 0 && ['compare', 'How it compares'],
    (cert.officialResources || []).length > 0 && ['resources', 'Resources'],
    (cert.faqs || []).length > 0 && ['faq', 'FAQ'],
  ].filter(Boolean) as [string, string][]

  const glance = [
    ['Vendor', cert.vendor],
    ['Questions', cert.examQuestionCount ? String(cert.examQuestionCount) : null],
    ['Time limit', cert.durationMinutes ? `${cert.durationMinutes} minutes` : null],
    ['Pass score', cert.passingScore ? `${cert.passingScore}%` : null],
    ['Delivery', cert.delivery],
    ['Our question bank', `${bankSize} question${bankSize === 1 ? '' : 's'}`],
  ].filter((r): r is [string, string] => Boolean(r[1]))

  return (
    <article className="pb-24">
      <JsonLd
        data={courseSchema({
          title: cert.title,
          slug: cert.slug || decodedSlug,
          summary: cert.summary,
          vendor: cert.vendor,
          // Exam codes are for the admin only and are not published.
        })}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Certifications', path: '/certifications' },
          { name: cert.title, path: `/certifications/${cert.slug}` },
        ])}
      />
      {(cert.faqs || []).length > 0 && (
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: (cert.faqs || []).map((f) => ({
              '@type': 'Question',
              name: f.question,
              acceptedAnswer: { '@type': 'Answer', text: f.answer },
            })),
          }}
        />
      )}

      {samples.length > 0 && (
        <JsonLd
          data={quizSchema({
            name: `${cert.title} sample questions`,
            path: `/certifications/${cert.slug}#sample-questions`,
            questions: samples.flatMap((q) => {
              const fb = sampleAnswers.get(q.id)
              const correct = fb && q.options.find((o) => o.letter === fb.correct)?.text
              return correct
                ? [{ text: q.text, options: q.options.map((o) => o.text), correct, explanation: fb.explanation }]
                : []
            }),
          })}
        />
      )}

      {/* Hero */}
      <section className="bg-hero text-white">
        <div className={`${container} grid grid-cols-[minmax(0,1fr)] gap-10 py-12 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)] lg:py-16`}>
          <div className="flex min-w-0 flex-col gap-5">
            <nav aria-label="Breadcrumb" className="flex flex-wrap gap-2 text-sm text-hero-muted">
              <Link href="/certifications" className="text-hero-muted no-underline hover:text-white">
                Certifications
              </Link>
              {category && (
                <>
                  <span aria-hidden="true">/</span>
                  <Link href={categoryHref(category.value)} className="text-hero-muted no-underline hover:text-white">
                    {category.label}
                  </Link>
                </>
              )}
              <span aria-hidden="true">/</span>
              <span className="text-white">{cert.title}</span>
            </nav>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-bold ${retired ? 'bg-[#FEE4E2] text-[#912018]' : 'bg-mint text-mint-foreground'}`}
              >
                {statusLabel}
              </span>
              <span className="text-[13px] text-hero-muted">Updated {updated}</span>
            </div>
            <h1 className="m-0 text-[32px] font-extrabold leading-[1.08] tracking-[-0.035em] sm:text-[48px]">{cert.title} practice exams</h1>
            {cert.summary && <p className="m-0 max-w-[640px] text-lg leading-relaxed text-hero-body">{cert.summary}</p>}

            {retired ? (
              <div className="flex flex-col gap-2 rounded-2xl border border-[#FDA29B] bg-[#33110E] p-5">
                <strong className="text-base">This exam is retired.</strong>
                <span className="text-[15px] leading-relaxed text-hero-body">
                  The vendor no longer offers this exam.{' '}
                  {replacement ? (
                    <>
                      It has been replaced by{' '}
                      <Link href={`/certifications/${replacement.slug}`} className="font-bold text-mint">
                        {replacement.title}
                      </Link>
                      .
                    </>
                  ) : (
                    'You can still use these questions to study the topics.'
                  )}
                </span>
              </div>
            ) : null}

            {bankSize > 0 && (
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href={quizUrl}
                  className="flex h-[52px] items-center rounded-xl bg-mint px-6 text-base font-bold text-mint-foreground no-underline hover:text-mint-foreground hover:brightness-95"
                >
                  Take a mock exam
                </Link>
                <Link
                  href={quizUrl}
                  className="flex h-[52px] items-center rounded-xl border border-hero-border px-6 text-base font-bold text-white no-underline hover:bg-hero-raised hover:text-white"
                >
                  Practice by domain
                </Link>
                {samples.length > 0 && (
                  <a href="#sample-questions" className="text-[15px] font-semibold text-mint no-underline hover:text-mint">
                    Try {samples.length} sample question{samples.length === 1 ? '' : 's'} first
                  </a>
                )}
              </div>
            )}
          </div>

          <aside aria-label="Exam at a glance" className="self-start rounded-[20px] border border-hero-border bg-hero-raised p-6">
            <h2 className="m-0 mb-4 text-xs font-bold uppercase tracking-[0.08em] text-hero-muted">Exam at a glance</h2>
            <dl className="m-0 flex flex-col">
              {glance.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 border-b border-hero-border py-2.5 last:border-0">
                  <dt className="text-sm text-hero-muted">{label}</dt>
                  <dd className="m-0 text-right text-sm font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
            {cert.officialUrl && (
              <a
                href={cert.officialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-block text-sm font-semibold text-mint no-underline hover:text-mint"
              >
                Official exam page
              </a>
            )}
          </aside>
        </div>
      </section>

      {/* Sticky jump bar */}
      {jump.length > 1 && (
        <nav aria-label="On this page" className="sticky top-[65px] z-20 border-b border-border bg-card/95 backdrop-blur-sm">
          <div className={`${container} flex gap-1 overflow-x-auto py-2 text-sm font-semibold`}>
            {jump.map(([id, label]) => (
              <a key={id} href={`#${id}`} className="whitespace-nowrap rounded-lg px-3 py-2 text-muted-foreground no-underline hover:bg-muted hover:text-foreground">
                {label}
              </a>
            ))}
          </div>
        </nav>
      )}

      <div className={`${container} flex flex-col gap-16 pt-12`}>
        {/* About the exam */}
        {about && (
          <section id="about" className={sectionClass}>
            <h2 className={h2}>About the {cert.title} exam</h2>
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="flex min-w-0 flex-col gap-6">
                {cert.overview && <RichText data={cert.overview} enableGutter={false} className="mx-0" />}
                {cert.whoItsFor && (
                  <div className="flex flex-col gap-2">
                    <h3 className="m-0 text-lg font-bold">Who it&apos;s for</h3>
                    <p className="m-0 whitespace-pre-line leading-relaxed text-body">{cert.whoItsFor}</p>
                  </div>
                )}
                {cert.background && (
                  <div className="flex flex-col gap-2">
                    <h3 className="m-0 text-lg font-bold">Recommended background</h3>
                    <p className="m-0 whitespace-pre-line leading-relaxed text-body">{cert.background}</p>
                  </div>
                )}
                {(cert.roles || []).length > 0 && (
                  <div className="flex flex-col gap-2">
                    <h3 className="m-0 text-lg font-bold">Job roles</h3>
                    <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
                      {(cert.roles || []).map((r) => (
                        <li key={r.id || r.role} className="rounded-full bg-muted px-3 py-1.5 text-sm font-medium">
                          {r.role}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              {(cert.authorName || cert.reviewerName) && (
                <aside className={`${cardClass} flex h-fit flex-col gap-4`}>
                  {cert.authorName && (
                    <div className="flex flex-col">
                      <span className="text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground">Written by</span>
                      <span className="font-bold">{cert.authorName}</span>
                      {cert.authorRole && <span className="text-sm text-muted-foreground">{cert.authorRole}</span>}
                    </div>
                  )}
                  {cert.reviewerName && (
                    <div className="flex flex-col">
                      <span className="text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground">Reviewed by</span>
                      <span className="font-bold">{cert.reviewerName}</span>
                      {cert.reviewerCredential && <span className="text-sm text-muted-foreground">{cert.reviewerCredential}</span>}
                    </div>
                  )}
                  <span className="text-[13px] text-muted-foreground">Last updated {updated}</span>
                </aside>
              )}
            </div>
          </section>
        )}

        {/* Exam domains */}
        {domains.length > 0 && (
          <section id="domains" className={sectionClass}>
            <h2 className={h2}>Exam domains</h2>
            <div className="flex flex-col gap-3">
              {domains.map((d) => (
                <div key={d.name} className={`${cardClass} flex flex-col gap-3`}>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <h3 className="m-0 text-[17px] font-bold">{d.name}</h3>
                    <span className="text-sm text-muted-foreground">
                      {d.weight !== null && <strong className="text-foreground">{d.weight}% of the exam</strong>}
                      {d.weight !== null && ' · '}
                      {d.questions} practice question{d.questions === 1 ? '' : 's'}
                    </span>
                  </div>
                  {d.weight !== null && (
                    <span className="block h-2 rounded-full bg-muted">
                      <span className="block h-2 rounded-full bg-primary" style={{ width: `${Math.min(100, d.weight)}%` }} />
                    </span>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {d.questions > 0 && (
                      <Link
                        href={`${quizUrl}?domain=${encodeURIComponent(d.name)}`}
                        className="inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground no-underline hover:bg-primary-hover hover:text-primary-foreground"
                      >
                        Practice
                      </Link>
                    )}
                    {d.guide && (
                      <Link
                        href={`/posts/${d.guide.slug}`}
                        className="inline-flex h-10 items-center rounded-xl border border-input px-4 text-sm font-bold text-foreground no-underline hover:border-primary hover:text-foreground"
                      >
                        Study guide
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Topics and tools on the exam */}
        {topics.length > 0 && (
          <section id="topics" className={sectionClass}>
            <h2 className={h2}>Topics and tools on the exam</h2>
            <div className="flex flex-col gap-5">
              {topics.map((t) => (
                <div key={t.domain} className="flex flex-col gap-2.5">
                  <h3 className="m-0 text-sm font-bold text-muted-foreground">{t.domain}</h3>
                  <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
                    {t.items.map((item) => (
                      <li key={item.id}>
                        <Link
                          href={`/posts/${t.slug}#${item.id}`}
                          className="inline-block rounded-full border border-border bg-card px-3.5 py-1.5 text-sm font-medium text-foreground no-underline hover:border-primary hover:text-primary"
                        >
                          {item.text}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Ad slot: reserved for Phase 6 (AdSense with cookie consent). Nothing is rendered until then. */}

        {/* Sample questions */}
        {samples.length > 0 && (
          <section id="sample-questions" className={sectionClass}>
            <div className="flex flex-col gap-2">
              <h2 className={h2}>Sample questions</h2>
              <p className="m-0 text-muted-foreground">Try these without an account. Open &ldquo;Show answer&rdquo; when you&apos;re ready.</p>
            </div>
            <div className="flex flex-col gap-4">
              {samples.map((q, i) => {
                const fb = sampleAnswers.get(q.id)
                return (
                  <div key={q.id} className={`${cardClass} flex flex-col gap-4`}>
                    <div className="flex flex-wrap items-center gap-2 text-[13px]">
                      <span className="font-mono font-semibold text-muted-foreground">Q{i + 1}</span>
                      <span className="rounded-full bg-muted px-2.5 py-1 font-semibold">{q.domain}</span>
                    </div>
                    <h3 className="m-0 whitespace-pre-line text-lg font-semibold leading-[1.45]">{q.text}</h3>
                    <ul className="m-0 flex list-none flex-col gap-2 p-0">
                      {q.options.map((o) => (
                        <li key={o.letter} className="flex items-center gap-3 rounded-xl border border-border px-4 py-2.5">
                          <span className="flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-muted text-[13px] font-bold">{o.letter}</span>
                          <span>{o.text}</span>
                        </li>
                      ))}
                    </ul>
                    {fb && (
                      <details className="group rounded-xl bg-success px-4 py-3 text-success-foreground">
                        <summary className="cursor-pointer text-sm font-bold">Show answer</summary>
                        <p className="m-0 mt-2 text-[15px] leading-relaxed">
                          <strong>
                            {fb.correct}. {q.options.find((o) => o.letter === fb.correct)?.text}
                          </strong>
                          {fb.explanation ? ` ${fb.explanation}` : ''}
                        </p>
                      </details>
                    )}
                  </div>
                )
              })}
            </div>
            {bankSize > samples.length && (
              <Link href={quizUrl} className={`${primaryBtn} w-fit`}>
                Practise all {bankSize} questions
              </Link>
            )}
          </section>
        )}

        {/* Study guides */}
        {guides.length > 0 && (
          <section id="study-guides" className={sectionClass}>
            <div className="flex flex-col gap-2">
              <h2 className={h2}>Study guides</h2>
              <p className="m-0 text-muted-foreground">One guide per exam domain, covering the questions in that domain.</p>
            </div>
            <div className="grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(min(100%,340px),1fr))]">
              {guides.map((d) => {
                const post = guideBySlug.get((d.guide as Post).slug)
                return (
                  <Link
                    key={d.name}
                    href={`/posts/${(d.guide as Post).slug}`}
                    className={`${cardClass} flex flex-col gap-2.5 text-card-foreground no-underline hover:border-primary hover:text-card-foreground`}
                  >
                    <span className="text-xs font-bold uppercase tracking-[0.06em] text-primary">{d.name}</span>
                    <span className="text-lg font-bold leading-snug">{(d.guide as Post).title}</span>
                    {post?.meta?.description && <span className="line-clamp-3 text-[15px] leading-relaxed text-muted-foreground">{post.meta.description}</span>}
                    <span className="mt-auto text-sm font-semibold text-primary">
                      Read the guide · {d.questions} question{d.questions === 1 ? '' : 's'}
                    </span>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {/* Study plan */}
        {(cert.studyPlan || []).length > 0 && (
          <section id="study-plan" className={sectionClass}>
            <h2 className={h2}>
              {(cert.studyPlan || []).length}-week study plan
            </h2>
            <ol className="m-0 grid list-none gap-4 p-0 [grid-template-columns:repeat(auto-fill,minmax(min(100%,270px),1fr))]">
              {(cert.studyPlan || []).map((w, i) => (
                <li key={w.id || i} className={`${cardClass} flex flex-col gap-2`}>
                  <span className="font-mono text-[13px] font-semibold text-primary">{w.label || `Week ${i + 1}`}</span>
                  {w.title && <span className="text-[17px] font-bold leading-snug">{w.title}</span>}
                  {w.text && <span className="whitespace-pre-line text-[15px] leading-relaxed text-muted-foreground">{w.text}</span>}
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* How it compares */}
        {(cert.comparisonRows || []).length > 0 && (
          <section id="compare" className={sectionClass}>
            <h2 className={h2}>How it compares</h2>
            <div className="overflow-x-auto rounded-[20px] border border-border bg-card">
              <table className="w-full min-w-[520px] border-collapse text-left text-[15px]">
                <thead>
                  <tr className="border-b border-border">
                    <th scope="col" className="px-5 py-3.5 font-semibold text-muted-foreground">
                      <span className="sr-only">Feature</span>
                    </th>
                    <th scope="col" className="px-5 py-3.5 font-bold">
                      {cert.title}
                    </th>
                    <th scope="col" className="px-5 py-3.5 font-bold">
                      {cert.comparedExamName || 'Compared exam'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(cert.comparisonRows || []).map((row, i) => (
                    <tr key={row.id || i} className="border-b border-border last:border-0">
                      <th scope="row" className="px-5 py-3.5 font-semibold text-muted-foreground">
                        {row.label}
                      </th>
                      <td className="px-5 py-3.5">{row.thisExam}</td>
                      <td className="px-5 py-3.5">{row.otherExam}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Affiliate courses */}
        {(cert.affiliateCourses || []).length > 0 && (
          <section className={sectionClass}>
            <div className="flex flex-col gap-2">
              <h2 className={h2}>Want video lessons or hands-on labs?</h2>
              <p className="m-0 text-sm text-muted-foreground">
                Disclosure: these are affiliate links. If you buy through them, CertGenius may earn a commission at no extra cost
                to you.
              </p>
            </div>
            <div className="grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(min(100%,340px),1fr))]">
              {(cert.affiliateCourses || []).map((a, i) => (
                <a
                  key={a.id || i}
                  href={a.url}
                  target="_blank"
                  rel="sponsored nofollow noopener"
                  className={`${cardClass} flex flex-col gap-2.5 text-card-foreground no-underline hover:border-primary hover:text-card-foreground`}
                >
                  <span className="text-xs font-bold uppercase tracking-[0.06em] text-primary">
                    {AFFILIATE_TYPES.find((t) => t.value === a.type)?.label}
                    {a.partner ? ` · ${a.partner}` : ''}
                  </span>
                  <span className="text-lg font-bold leading-snug">{a.title}</span>
                  {(a.bulletOne || a.bulletTwo) && (
                    <ul className="m-0 flex list-disc flex-col gap-1 pl-5 text-[15px] text-muted-foreground">
                      {a.bulletOne && <li>{a.bulletOne}</li>}
                      {a.bulletTwo && <li>{a.bulletTwo}</li>}
                    </ul>
                  )}
                  <span className="mt-auto text-sm font-semibold text-primary">View course (sponsored)</span>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Official resources */}
        {(cert.officialResources || []).length > 0 && (
          <section id="resources" className={sectionClass}>
            <h2 className={h2}>Official resources</h2>
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              {(cert.officialResources || []).map((r, i) => (
                <li key={r.id || i} className={`${cardClass} flex flex-col gap-1`}>
                  <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-[17px] font-bold text-primary no-underline hover:text-primary-hover">
                    {r.name}
                  </a>
                  {r.description && <span className="text-[15px] leading-relaxed text-muted-foreground">{r.description}</span>}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* FAQ */}
        {(cert.faqs || []).length > 0 && (
          <section id="faq" className={sectionClass}>
            <h2 className={h2}>Frequently asked questions</h2>
            <div className="flex flex-col gap-3">
              {(cert.faqs || []).map((f, i) => (
                <details key={f.id || i} className="group rounded-2xl border border-border bg-card px-5 py-4">
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-3 text-base font-semibold [&::-webkit-details-marker]:hidden">
                    {f.question}
                    <span className="flex-none text-muted-foreground transition-transform group-open:rotate-45" aria-hidden="true">
                      +
                    </span>
                  </summary>
                  <p className="m-0 mt-3 whitespace-pre-line leading-relaxed text-muted-foreground">{f.answer}</p>
                </details>
              ))}
            </div>
          </section>
        )}

        {/* Related certifications */}
        {relatedCards.length > 0 && (
          <section className={sectionClass}>
            <h2 className={h2}>Related certifications</h2>
            <div className="grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(min(100%,340px),1fr))]">
              {relatedCards.map((c) => (
                <CertCardView key={c.id} cert={c} />
              ))}
            </div>
          </section>
        )}

        <p className="m-0 border-t border-border pt-6 text-[13px] leading-relaxed text-muted-foreground">
          CertGenius is not affiliated with or endorsed by {cert.vendor || 'the exam vendor'}. {cert.title} is a trademark of its respective owner. Practice
          questions are original and written from the published exam objectives.
        </p>
      </div>
    </article>
  )
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { slug = '' } = await paramsPromise
  const cert = await queryCertificationBySlug({ slug: decodeURIComponent(slug) })
  if (!cert) return { title: 'Certification | CertGenius' }
  const title = `${cert.title} practice exams | CertGenius`
  const description =
    cert.summary || `Free ${cert.title} practice questions, exam simulations and study guides, with every answer explained.`
  const url = `${getServerSideURL()}/certifications/${cert.slug}`
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: 'CertGenius', type: 'website' },
  }
}

const queryCertificationBySlug = cache(async ({ slug }: { slug: string }) => {
  const { isEnabled: draft } = await draftMode()
  const payload = await getPayload({ config: configPromise })

  const result = await payload.find({
    collection: 'certifications',
    depth: 1,
    draft,
    limit: 1,
    overrideAccess: draft,
    pagination: false,
    where: { slug: { equals: slug } },
  })

  return result.docs?.[0] || null
})
