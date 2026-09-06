import React from 'react'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { BookOpen, FlaskConical, TrendingUp, Gift, type LucideIcon } from 'lucide-react'
import { Media } from '@/components/Media'

type Feature = {
  icon: LucideIcon
  title: string
  description: string
  badge?: string
}

const leftFeatures: Feature[] = [
  {
    icon: BookOpen,
    title: 'Guided Practice Paths',
    description:
      'Questions organized by topic, so you always know exactly where your weak spots are before exam day.',
  },
  {
    icon: FlaskConical,
    title: 'Hands-On Labs',
    description:
      'Sandbox environments to practice the real services each exam covers, not just multiple-choice recall.',
    badge: 'Coming soon',
  },
]

const rightFeatures: Feature[] = [
  {
    icon: TrendingUp,
    title: 'Structured Skill Growth',
    description: 'Move from foundational to advanced certifications at your own pace.',
  },
  {
    icon: Gift,
    title: 'Always Free',
    description: 'No subscriptions, no paywalls, no credit card - every study guide is free.',
  },
]

// Looked up by this exact alt text - see the "Home" edit guide for where to
// upload it in admin. Nothing breaks if it hasn't been uploaded yet: the
// section falls back to a small code-drawn visual instead.
const PHOTO_ALT_TEXT = 'Homepage hands-on lab photo'

const FeatureItem: React.FC<{ feature: Feature }> = ({ feature }) => {
  const Icon = feature.icon
  return (
    <div className="flex gap-4">
      <div className="shrink-0 w-11 h-11 rounded-xl border-2 border-chart-5/40 bg-chart-5/10 flex items-center justify-center">
        <Icon className="w-5 h-5 text-chart-5" strokeWidth={2} />
      </div>
      <div>
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <h3 className="font-bold">{feature.title}</h3>
          {feature.badge && (
            <span className="text-[10px] font-bold uppercase tracking-wide bg-accent text-accent-foreground rounded-full px-2 py-0.5 whitespace-nowrap">
              {feature.badge}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
      </div>
    </div>
  )
}

// Fallback used until a photo is uploaded (see PHOTO_ALT_TEXT above) - a
// small, code-drawn "practice session" card. Fixed, modest width in normal
// document flow, so it can never overlap or push against surrounding
// content (a previous version broke this with a fixed-width element inside
// an auto-sized grid column).
const PracticeSessionVisual: React.FC = () => (
  <div className="relative w-[240px] mx-auto">
    <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-chart-5/15" aria-hidden />
    <div className="relative bg-card border border-border rounded-2xl shadow-lg p-6">
      <div className="flex items-center gap-3 mb-4">
        <svg viewBox="0 0 36 36" className="w-12 h-12 -rotate-90 shrink-0">
          <circle cx="18" cy="18" r="15.5" fill="none" className="stroke-border" strokeWidth="3" />
          <circle
            cx="18"
            cy="18"
            r="15.5"
            fill="none"
            className="stroke-primary"
            strokeWidth="3"
            strokeDasharray="97.4"
            strokeDashoffset="24.4"
            strokeLinecap="round"
          />
        </svg>
        <div>
          <div className="text-lg font-extrabold leading-none">75%</div>
          <div className="text-xs text-muted-foreground mt-1">Question 15 of 20</div>
        </div>
      </div>
      <div className="text-sm font-semibold mb-2">Practice session in progress</div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className="h-full w-3/4 rounded-full bg-chart-5" />
      </div>
    </div>
  </div>
)

export const PlatformFeatures: React.FC = async () => {
  const payload = await getPayload({ config: configPromise })
  const photoResult = await payload.find({
    collection: 'media',
    where: { alt: { equals: PHOTO_ALT_TEXT } },
    limit: 1,
  })
  const photo = photoResult.docs[0]

  return (
    <div className="py-16 md:py-24">
      <div className="container">
        <div className="max-w-2xl mx-auto text-center mb-14">
          <div className="text-xs font-bold uppercase tracking-wide text-primary mb-3">
            How CertGenius Works
          </div>
          <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight">
            Study smarter, not just harder
          </h2>
        </div>

        {photo ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-8 items-center">
            <div className="flex flex-col gap-10 order-2 lg:order-1">
              {leftFeatures.map((feature) => (
                <FeatureItem key={feature.title} feature={feature} />
              ))}
            </div>

            <div className="order-1 lg:order-2">
              {/* Relative sizing (aspect-ratio + fill), never a fixed pixel
                  width - so this always fits its grid column at any
                  viewport width and can't overlap the text columns. */}
              <div className="relative w-full max-w-sm mx-auto aspect-[4/5] rounded-3xl overflow-hidden bg-accent">
                <Media resource={photo} fill imgClassName="object-cover" />
              </div>
            </div>

            <div className="flex flex-col gap-10 order-3">
              {rightFeatures.map((feature) => (
                <FeatureItem key={feature.title} feature={feature} />
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="mb-16">
              <PracticeSessionVisual />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-10">
              {[...leftFeatures, ...rightFeatures].map((feature) => {
                const Icon = feature.icon
                return (
                  <div key={feature.title} className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-primary" strokeWidth={2} />
                    </div>
                    <div className="flex items-center gap-2 mb-2 flex-wrap justify-center">
                      <h3 className="font-bold">{feature.title}</h3>
                      {feature.badge && (
                        <span className="text-[10px] font-bold uppercase tracking-wide bg-chart-5 text-[oklch(20%_0.05_70deg)] rounded-full px-2 py-0.5 whitespace-nowrap">
                          {feature.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
