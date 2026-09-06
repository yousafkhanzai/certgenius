import React from 'react'
import { BookOpen, FlaskConical, TrendingUp, Gift, type LucideIcon } from 'lucide-react'

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
      'Work through questions organized by topic, so you always know exactly where your weak spots are before exam day.',
  },
  {
    icon: FlaskConical,
    title: 'Hands-On Labs',
    description:
      'Sandbox environments where you practice the real services each exam covers, not just multiple-choice recall.',
    badge: 'Coming soon',
  },
]

const rightFeatures: Feature[] = [
  {
    icon: TrendingUp,
    title: 'Structured Skill Growth',
    description:
      'Move from foundational to advanced certifications at your own pace, organized by career stage.',
  },
  {
    icon: Gift,
    title: 'Always Free',
    description:
      'No subscriptions, no paywalls, no credit card. Every practice test and study guide is free to use.',
  },
]

const FeatureItem: React.FC<{ feature: Feature; align: 'left' | 'right' }> = ({
  feature,
  align,
}) => {
  const Icon = feature.icon
  return (
    <div
      className={`flex gap-4 ${align === 'right' ? 'md:flex-row-reverse md:text-right' : ''}`}
    >
      <div className="shrink-0 w-11 h-11 rounded-xl border-2 border-chart-5/40 bg-chart-5/10 flex items-center justify-center">
        <Icon className="w-5 h-5 text-chart-5" strokeWidth={2} />
      </div>
      <div>
        <div className="flex items-center gap-2 mb-1.5">
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

// Center visual is an original, code-drawn mockup (a practice-session card),
// not a photo - keeps the "how it works" section feeling concrete without
// needing stock photography.
const PracticeSessionVisual: React.FC = () => (
  <div className="relative w-full max-w-[280px] aspect-square mx-auto">
    <div
      className="absolute inset-0 rounded-full bg-gradient-to-br from-accent to-transparent"
      aria-hidden
    />
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="bg-card border border-border rounded-2xl shadow-lg p-6 w-[220px]">
        <div className="flex items-center gap-3 mb-4">
          <svg viewBox="0 0 36 36" className="w-12 h-12 -rotate-90 shrink-0">
            <circle
              cx="18"
              cy="18"
              r="15.5"
              fill="none"
              className="stroke-border"
              strokeWidth="3"
            />
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
  </div>
)

export const PlatformFeatures: React.FC = () => {
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

        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-10 md:gap-8 items-center">
          <div className="flex flex-col gap-10">
            {leftFeatures.map((feature) => (
              <FeatureItem key={feature.title} feature={feature} align="left" />
            ))}
          </div>

          <div className="hidden md:block">
            <PracticeSessionVisual />
          </div>
          <div className="md:hidden -my-2">
            <PracticeSessionVisual />
          </div>

          <div className="flex flex-col gap-10">
            {rightFeatures.map((feature) => (
              <FeatureItem key={feature.title} feature={feature} align="right" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
