import React from 'react'

import { countryName } from '@/utilities/countries'

// Shows "Pakistan" instead of "PK" in the admin's student list.
export default function CountryCell({ cellData }: { cellData?: unknown }) {
  return <span>{typeof cellData === 'string' && cellData ? countryName(cellData) : '-'}</span>
}
