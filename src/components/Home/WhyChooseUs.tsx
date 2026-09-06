import React from 'react'
import { Gift, Target, FileCheck, Layers, ShieldCheck, type LucideIcon } from 'lucide-react'

type Reason = {
  icon: LucideIcon
  title: string
  description: string
}

const reasons: Reason[] = [
  {
    icon: Gift,
    title: '100% free',
    description: 'No subscription, no paywall, no credit card - every practice test is free.',
  },
  {
    icon: Target,
    title: 'Practice-first learning',
    description: 'Learn by working real exam-style questions, not just reading theory.',
  },
  {
    icon: FileCheck,
    title: 'Real exam format',
    description: 'Questions modeled on the actual certification exams, so nothing surprises you.',
  },
  {
    icon: Layers,
    title: 'Built for every level',
    description: 'From your first certification to advanced, multi-cloud mastery.',
  },
  {
    icon: ShieldCheck,
    title: 'Independent & unbiased',
    description: 'Not affiliated with AWS, Microsoft, or Google - our content stays honest.',
  },
]

export const WhyChooseUs: React.FC = () => {
  return (
    <div className="py-16 md:py-24">
      <div className="container">
        <div className="max-w-2xl mx-auto text-center mb-14">
          <div className="text-xs font-bold uppercase tracking-wide text-primary mb-3">
            Why CertGenius
          </div>
          <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight">
            A study platform without the catch
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-10">
          {reasons.map((reason) => {
            const Icon = reason.icon
            return (
              <div key={reason.title} className="flex gap-4">
                <div className="shrink-0 w-11 h-11 rounded-xl bg-accent flex items-center justify-center">
                  <Icon className="w-5 h-5 text-primary" strokeWidth={2} />
                </div>
                <div>
                  <h3 className="font-bold mb-1.5">{reason.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {reason.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
