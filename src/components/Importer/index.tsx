import type { AdminViewServerProps } from 'payload'

import { DefaultTemplate } from '@payloadcms/next/templates'
import { Gutter } from '@payloadcms/ui'
import { redirect } from 'next/navigation'
import React from 'react'

import { ImporterClient } from './ImporterClient'

// Admin page at /admin/import - upload question or certification spreadsheets.
export default function ImportView({ initPageResult, params, searchParams }: AdminViewServerProps) {
  const { req, permissions, locale, visibleEntities } = initPageResult

  if (req.user?.collection !== 'users') {
    redirect('/admin/login')
  }

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
      <Gutter>
        <h1 style={{ margin: '1.5rem 0 0.5rem' }}>Import</h1>
        <p style={{ opacity: 0.75, marginBottom: '2rem' }}>
          Upload a spreadsheet, check the preview and validation report, then import. Only valid
          rows are saved, and the same question is never saved twice.
        </p>
        <ImporterClient />
      </Gutter>
    </DefaultTemplate>
  )
}
