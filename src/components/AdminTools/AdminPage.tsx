import type { AdminViewServerProps } from 'payload'

import { DefaultTemplate } from '@payloadcms/next/templates'
import { Gutter } from '@payloadcms/ui'
import { redirect } from 'next/navigation'
import React from 'react'

import './tools.scss'

// Frame for the admin tool pages: the normal admin menu and header around
// our own content. Admins only.
export function AdminPage({
  props,
  title,
  lead,
  children,
}: {
  props: AdminViewServerProps
  title: string
  lead?: React.ReactNode
  children: React.ReactNode
}) {
  const { initPageResult, params, searchParams } = props
  const { req, permissions, locale, visibleEntities } = initPageResult
  if (req.user?.collection !== 'users') redirect('/admin/login')

  return (
    <DefaultTemplate
      i18n={req.i18n}
      locale={locale}
      params={params}
      payload={req.payload}
      permissions={permissions}
      req={req}
      searchParams={searchParams}
      user={req.user}
      visibleEntities={visibleEntities}
    >
      <Gutter className="cg-tools">
        <h1 className="cg-tools__title">{title}</h1>
        {lead && <p className="cg-tools__lead">{lead}</p>}
        {children}
      </Gutter>
    </DefaultTemplate>
  )
}

export const isAdmin = (props: AdminViewServerProps) => props.initPageResult.req.user?.collection === 'users'

export const formatDate = (iso: string | Date | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''
