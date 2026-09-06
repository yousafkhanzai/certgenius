import React from 'react'
import { GraduationCap, Target, Wrench, Trophy, type LucideIcon } from 'lucide-react'

type Stage = {
  icon: LucideIcon
  title: string
  description: string
}

const stages: Stage[] = [
  {
    icon: GraduationCap,
    title: 'Start with the fundamentals',
    description:
      'Build a solid foundation with beginner-friendly certifications and clear explanations for every concept.',
  },
  {
    icon: Target,
    title: 'Prove what you know',
    description:
      'Practice tests modeled on the real exam format help you walk in ready, not guessing.',
  },
  {
    icon: Wrench,
    title: 'Sharpen real skills',
    description:
      'Go beyond memorization - apply what you’ve learned with hands-on labs once they launch.',
  },
  {
    icon: Trophy,
    title: 'Reach advanced certifications',
    description:
      'Take on multi-cloud and specialist-level exams once you’ve built up real, tested experience.',
  },
]

export const LearningJourney: React.FC = () => {
  return (
    <div className="py-16 md:py-24 bg-secondary/40">
      <div className="container">
        <div className="max-w-2xl mx-auto text-center mb-14">
          <div className="text-xs font-bold uppercase tracking-wide text-primary mb-3">
            Your Path Forward
          </div>
          <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight mb-4">
            Wherever you are, there&rsquo;s a clear next step
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            CertGenius is built around how careers in cloud and AI actually progress - from your
            first certification to advanced, specialist-level mastery.
          </p>
        </div>

        <div className="relative grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-6">
          <div
            className="hidden md:block absolute top-7 left-[12.5%] right-[12.5%] h-px bg-border"
            aria-hidden
          />
          {stages.map((stage, index) => {
            const Icon = stage.icon
            return (
              <div key={stage.title} className="relative flex flex-col items-center text-center">
                <div className="relative z-10 w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center mb-5 shrink-0 shadow-sm">
                  <Icon className="w-6 h-6" strokeWidth={2} />
                  <span className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-chart-5 text-[oklch(20%_0.05_70deg)] text-xs font-extrabold flex items-center justify-center border-2 border-background">
                    {index + 1}
                  </span>
                </div>
                <h3 className="font-bold mb-2">{stage.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {stage.description}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
