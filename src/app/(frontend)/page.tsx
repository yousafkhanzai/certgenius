import type { Metadata } from 'next'

import configPromise from '@payload-config'
import {
  Blocks,
  Bot,
  Building2,
  ClipboardList,
  Cloud,
  CloudCog,
  Database,
  Flag,
  Gamepad2,
  GitBranch,
  HeartPulse,
  Layers,
  Lock,
  Monitor,
  Network,
  PenTool,
  RefreshCw,
  Scale,
  Server,
  ShieldCheck,
  Smartphone,
  type LucideIcon,
} from 'lucide-react'
import Link from 'next/link'
import { getPayload } from 'payload'
import React from 'react'

import { JsonLd } from '@/components/JsonLd'
import { CertCardView, ComingSoonCard } from '@/components/Home/CertCardView'
import { HOME_FAQ } from '@/components/Home/faq'
import { TryQuestion } from '@/components/Home/TryQuestion'
import { WelcomeBack } from '@/components/Home/WelcomeBack'
import { getPublishedCertification, guestQuestionIds, publicQuestions } from '@/quiz/server'
import { homeData } from '@/site/data'
import { getServerSideURL } from '@/utilities/getURL'

// Rebuilt from live data every 10 minutes: new certifications, questions and
// blogs appear on their own, and the page stays static and fast.
export const revalidate = 600

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  'cloud-ai': CloudCog,
  'ai-vendor': Bot,
  'ai-security-governance': ShieldCheck,
  blockchain: Blocks,
  'cloud-general': Cloud,
  cybersecurity: Lock,
  'data-engineering-analytics': Database,
  'devops-sre': GitBranch,
  'networking-it-support': Network,
  'project-management': ClipboardList,
  'agile-scrum': RefreshCw,
  'finance-legal': Scale,
  healthcare: HeartPulse,
  'backend-development': Server,
  'frontend-development': Monitor,
  'full-stack': Layers,
  'ui-ux-design': PenTool,
  'mobile-development': Smartphone,
  'game-development': Gamepad2,
  'enterprise-platforms': Building2,
}

const FEATURES = [
  { title: 'Real exam length and timer', text: 'Exam simulations use the same number of questions, time limit and pass score as the real exam.' },
  { title: 'Weighted by exam domain', text: 'Questions are drawn from each domain in the same proportions the vendor publishes.' },
  { title: 'Every answer explained', text: 'See why the right answer is right and why each of the others is wrong.' },
  { title: 'A study guide for every domain', text: 'Each domain has one guide that covers its questions, linked from every question.' },
  { title: 'Readiness and mastery tracking', text: 'Know when you are on track to pass, domain by domain.' },
  { title: 'Hints, bookmarks and cross-outs', text: 'Practise with hints, save tricky questions and rule out wrong options like on test day.' },
]

const sectionTitle = 'm-0 text-[28px] font-extrabold leading-tight tracking-[-0.03em] sm:text-[34px]'
const eyebrow = 'text-xs font-bold uppercase tracking-[0.08em] text-primary'
const container = 'mx-auto max-w-[1240px] px-4 sm:px-6'

async function tryQuestion(slug: string | undefined) {
  if (!slug) return null
  const payload = await getPayload({ config: configPromise })
  const cert = await getPublishedCertification(payload, slug)
  if (!cert) return null
  const ids = await guestQuestionIds(payload, Number(cert.id))
  if (!ids.length) return null
  // A different free question each day.
  const pick = ids[Math.floor(Date.now() / 86_400_000) % ids.length]
  const [question] = await publicQuestions(payload, [pick], cert)
  if (!question) return null
  return { question: { ...question, hint: null }, cert: { slug: cert.slug as string, title: cert.title, examCode: cert.examCode ?? null } }
}

export default async function HomePage() {
  const data = await homeData()
  const top = data.popular[0]
  const sample = await tryQuestion(top?.slug).catch(() => null)
  const startHref = top ? `/certifications/${top.slug}/quiz` : '/certifications'
  const stats = [
    { value: data.stats.questions, label: 'practice questions' },
    { value: data.stats.certifications, label: `certification${data.stats.certifications === 1 ? '' : 's'}` },
    { value: data.stats.vendors, label: `vendor${data.stats.vendors === 1 ? '' : 's'}` },
    { value: data.stats.guides, label: `study guide${data.stats.guides === 1 ? '' : 's'}` },
  ]
  const number = new Intl.NumberFormat('en-US')

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: HOME_FAQ.flatMap((g) => g.items).map((f) => ({
            '@type': 'Question',
            name: f.q,
            acceptedAnswer: { '@type': 'Answer', text: f.a },
          })),
        }}
      />

      {/* Hero */}
      <section className="bg-hero text-white">
        <div
          className={`${container} grid grid-cols-[minmax(0,1fr)] items-center gap-10 py-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:py-20`}
        >
          <div className="flex min-w-0 flex-col gap-6">
            <span className="w-fit rounded-full border border-hero-border bg-hero-raised px-3.5 py-1.5 text-[13px] font-semibold text-mint">
              100% free · Every answer explained
            </span>
            <h1 className="m-0 text-[32px] font-extrabold leading-[1.08] tracking-[-0.035em] min-[420px]:text-[40px] sm:text-[56px]">
              Pass your IT certification with practice that feels like the real exam
            </h1>
            <p className="m-0 max-w-[560px] text-lg leading-relaxed text-hero-body">
              Original practice questions, timed exam simulations and a study guide for every exam domain. No exam dumps, no
              paywalls.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href={startHref}
                className="flex h-[52px] items-center rounded-xl bg-mint px-6 text-base font-bold text-mint-foreground no-underline hover:text-mint-foreground hover:brightness-95"
              >
                Start practicing free
              </Link>
              <Link
                href="/certifications"
                className="flex h-[52px] items-center rounded-xl border border-hero-border px-6 text-base font-bold text-white no-underline hover:bg-hero-raised hover:text-white"
              >
                Browse certifications
              </Link>
            </div>
            <dl className="m-0 grid grid-cols-2 gap-x-8 gap-y-4 border-t border-hero-border pt-6 sm:grid-cols-4">
              {stats.map((s) => (
                <div key={s.label} className="flex flex-col">
                  <dd className="m-0 text-[28px] font-extrabold tracking-[-0.03em]">{number.format(s.value)}</dd>
                  <dt className="text-[13px] text-hero-muted">{s.label}</dt>
                </div>
              ))}
            </dl>
          </div>
          {sample && <TryQuestion question={sample.question} cert={sample.cert} />}
        </div>
      </section>

      <WelcomeBack />

      {/* Pick a certification */}
      {data.popular.length > 0 && (
        <section className={`${container} flex flex-col gap-8 py-16`}>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-col gap-2">
              <span className={eyebrow}>Popular</span>
              <h2 className={sectionTitle}>Pick a certification</h2>
            </div>
            <Link href="/certifications" className="text-[15px] font-semibold text-primary no-underline hover:text-primary-hover">
              View all certifications
            </Link>
          </div>
          <div className="grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(min(100%,340px),1fr))]">
            {data.popular.map((c) => (
              <CertCardView key={c.id} cert={c} />
            ))}
          </div>
        </section>
      )}

      {/* Just added */}
      {(data.justAdded.length > 0 || data.comingSoon.length > 0) && (
        <section className="border-y border-border bg-card">
          <div className={`${container} flex flex-col gap-8 py-16`}>
            <div className="flex flex-col gap-2">
              <span className={eyebrow}>New on CertGenius</span>
              <h2 className={sectionTitle}>Just added</h2>
            </div>
            <div className="grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(min(100%,270px),1fr))]">
              {data.justAdded.map((c) => (
                <CertCardView key={c.id} cert={c} />
              ))}
              {data.comingSoon.map((c) => (
                <ComingSoonCard key={c.id} cert={c} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Browse by vendor */}
      {data.vendors.length > 0 && (
        <section id="vendors" className={`${container} flex scroll-mt-24 flex-col gap-8 py-16`}>
          <div className="flex flex-col gap-2">
            <span className={eyebrow}>Vendors</span>
            <h2 className={sectionTitle}>Browse by vendor</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            {data.vendors.map((v) => (
              <Link
                key={v.name}
                href={`/certifications#vendor-${v.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-3.5 text-card-foreground no-underline hover:border-primary hover:text-card-foreground"
              >
                <span className="text-base font-bold">{v.name}</span>
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-[13px] font-semibold text-muted-foreground">
                  {v.count} certification{v.count === 1 ? '' : 's'}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Browse by category */}
      <section className="border-y border-border bg-card">
        <div className={`${container} flex flex-col gap-8 py-16`}>
          <div className="flex flex-col gap-2">
            <span className={eyebrow}>Categories</span>
            <h2 className={sectionTitle}>Browse by category</h2>
          </div>
          <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(100%,230px),1fr))]">
            {data.categories.map((c) => {
              const Icon = CATEGORY_ICONS[c.value] || Layers
              const inner = (
                <>
                  <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="text-[15px] font-bold leading-snug">{c.label}</span>
                    <span className="text-[13px] text-muted-foreground">
                      {c.count ? `${c.count} certification${c.count === 1 ? '' : 's'}` : 'Coming soon'}
                    </span>
                  </span>
                </>
              )
              return c.count ? (
                <Link
                  key={c.value}
                  href={`/certifications#${c.value}`}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-background p-4 text-foreground no-underline hover:border-primary hover:text-foreground"
                >
                  {inner}
                </Link>
              ) : (
                <div key={c.value} className="flex items-center gap-3 rounded-2xl border border-dashed border-border p-4 opacity-70">
                  {inner}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Built to mirror the real exam */}
      <section className={`${container} flex flex-col gap-8 py-16`}>
        <div className="flex max-w-[720px] flex-col gap-3">
          <span className={eyebrow}>How it works</span>
          <h2 className={sectionTitle}>Built to mirror the real exam</h2>
          <p className="m-0 text-lg leading-relaxed text-muted-foreground">
            Original questions written from official exam objectives, never exam dumps.
          </p>
        </div>
        <div className="grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(min(100%,340px),1fr))]">
          {FEATURES.map((f, i) => (
            <div key={f.title} className="flex gap-4 rounded-[20px] border border-border bg-card p-6">
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-[#0B1220] font-mono text-sm font-semibold text-white dark:bg-white dark:text-[#0B1220]">
                {i + 1}
              </span>
              <div className="flex flex-col gap-1.5">
                <h3 className="m-0 text-[17px] font-bold">{f.title}</h3>
                <p className="m-0 text-[15px] leading-relaxed text-muted-foreground">{f.text}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="m-0 flex items-start gap-2.5 rounded-2xl bg-secondary px-5 py-4 text-[15px] leading-relaxed text-secondary-foreground">
          <Flag className="mt-0.5 h-[18px] w-[18px] flex-none" aria-hidden="true" />
          <span>
            <strong>Spotted a wrong answer?</strong> Every question has a &ldquo;Report a problem&rdquo; link. We review every
            report and fix the question.
          </span>
        </p>
      </section>

      {/* Latest from the blog */}
      {data.posts.length > 0 && (
        <section className="border-y border-border bg-card">
          <div className={`${container} flex flex-col gap-8 py-16`}>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="flex flex-col gap-2">
                <span className={eyebrow}>Study guides</span>
                <h2 className={sectionTitle}>Latest from the blog</h2>
              </div>
              <Link href="/posts" className="text-[15px] font-semibold text-primary no-underline hover:text-primary-hover">
                All study guides
              </Link>
            </div>
            <div className="grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(min(100%,340px),1fr))]">
              {data.posts.map((p) => (
                <Link
                  key={p.slug}
                  href={`/posts/${p.slug}`}
                  className="flex flex-col gap-3 rounded-[20px] border border-border bg-background p-6 text-foreground no-underline hover:border-primary hover:text-foreground"
                >
                  {p.publishedAt && (
                    <span className="text-[13px] text-muted-foreground">
                      {new Date(p.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  )}
                  <span className="text-lg font-bold leading-snug">{p.title}</span>
                  {p.description && <span className="line-clamp-3 text-[15px] leading-relaxed text-muted-foreground">{p.description}</span>}
                  <span className="mt-auto text-sm font-semibold text-primary">Read the guide</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      <section id="faq" className={`${container} flex scroll-mt-24 flex-col gap-8 py-16`}>
        <div className="flex flex-col gap-2">
          <span className={eyebrow}>FAQ</span>
          <h2 className={sectionTitle}>Questions, answered</h2>
        </div>
        <div className="grid gap-8 lg:grid-cols-3">
          {HOME_FAQ.map((group) => (
            <div key={group.group} className="flex flex-col gap-3">
              <h3 className="m-0 text-[17px] font-bold">{group.group}</h3>
              {group.items.map((item) => (
                <details key={item.q} className="group rounded-2xl border border-border bg-card px-5 py-4">
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-3 text-[15px] font-semibold marker:hidden [&::-webkit-details-marker]:hidden">
                    {item.q}
                    <span className="mt-0.5 flex-none text-muted-foreground transition-transform group-open:rotate-45" aria-hidden="true">
                      +
                    </span>
                  </summary>
                  <p className="m-0 mt-3 text-[15px] leading-relaxed text-muted-foreground">{item.a}</p>
                </details>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* Sign-up banner */}
      <section className={`${container} pb-20`}>
        <div className="flex flex-wrap items-center justify-between gap-6 rounded-[24px] bg-hero p-8 text-white sm:p-10">
          <div className="flex max-w-[620px] flex-col gap-2">
            <h2 className="m-0 text-[28px] font-extrabold leading-tight tracking-[-0.03em]">Save your progress with a free account</h2>
            <p className="m-0 text-base leading-relaxed text-hero-body">
              Track your readiness, master every domain, bookmark tricky questions and take full exam simulations.
            </p>
          </div>
          <Link
            href="/signup"
            className="flex h-[52px] items-center rounded-xl bg-mint px-6 text-base font-bold text-mint-foreground no-underline hover:text-mint-foreground hover:brightness-95"
          >
            Create free account
          </Link>
        </div>
      </section>
    </>
  )
}

export function generateMetadata(): Metadata {
  const title = 'CertGenius: free IT certification practice exams and study guides'
  const description =
    'Free practice questions, timed exam simulations and study guides for IT certifications. Original questions written from official exam objectives, with every answer explained.'
  return {
    title,
    description,
    alternates: { canonical: getServerSideURL() },
    openGraph: { title, description, url: getServerSideURL(), siteName: 'CertGenius', type: 'website' },
  }
}
