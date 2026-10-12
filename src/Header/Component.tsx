import React from 'react'

import { SiteHeader } from '@/components/site/SiteHeader'

// The site header is fixed by the design system (see CLAUDE.md "PUBLIC PAGES"),
// so it no longer reads its links from the Header global in the admin.
export async function Header() {
  return <SiteHeader />
}
