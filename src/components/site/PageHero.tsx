import Link from 'next/link'
import React from 'react'

// Dark navy page header with a breadcrumb, used by listing and legal pages.
export function PageHero({
  crumbs,
  title,
  intro,
  children,
}: {
  crumbs: Array<{ name: string; href?: string }>
  title: string
  intro?: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <section className="bg-hero text-white">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-4 px-4 py-14 sm:px-6">
        <nav aria-label="Breadcrumb" className="flex flex-wrap gap-2 text-sm text-hero-muted">
          {crumbs.map((c, i) => (
            <React.Fragment key={c.name}>
              {i > 0 && <span aria-hidden="true">/</span>}
              {c.href ? (
                <Link href={c.href} className="text-hero-muted no-underline hover:text-white">
                  {c.name}
                </Link>
              ) : (
                <span className="text-white" aria-current="page">
                  {c.name}
                </span>
              )}
            </React.Fragment>
          ))}
        </nav>
        <h1 className="m-0 text-[34px] font-extrabold leading-tight tracking-[-0.03em] sm:text-[48px]">{title}</h1>
        {intro && <p className="m-0 max-w-[680px] text-lg leading-relaxed text-hero-body">{intro}</p>}
        {children}
      </div>
    </section>
  )
}

export const cardGrid = 'grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(min(100%,340px),1fr))]'
