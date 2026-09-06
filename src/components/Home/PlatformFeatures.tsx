import React from 'react'
import { BookOpen, FlaskConical, TrendingUp, Gift, type LucideIcon } from 'lucide-react'

type Feature = {
  icon: LucideIcon
  title: string
  description: string
  badge?: string
}

const features: Feature[] = [
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

// A small, code-drawn "practice session" card - not a photo (this environment
// has no image-generation tool). Fixed, modest size in normal document flow
// so it can never overlap or push against surrounding content.
const PracticeSessionVisual: React.FC = () => (
  <div className="relative w-[240px] mx-auto mb-16">
    <div
      className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-chart-5/15"
      aria-hidden
    />
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

export const PlatformFeatures: React.FC = () => {
  return (
    <div className="py-16 md:py-24">
      <div className="container">
        <div className="max-w-2xl mx-auto text-center mb-10">
          <div className="text-xs font-bold uppercase tracking-wide text-primary mb-3">
            How CertGenius Works
          </div>
          <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight">
            Study smarter, not just harder
          </h2>
        </div>

        <PracticeSessionVisual />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-10">
          {features.map((feature) => {
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
      </div>
    </div>
  )
}
