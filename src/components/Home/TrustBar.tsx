import React from 'react'
import { CheckCircle2 } from 'lucide-react'

// The vendors and the "free / no signup" line change rarely enough that
// keeping them in code (rather than a new CMS field) is the simpler trade-off -
// see the CertGenius workflow notes on code-owned vs. admin-editable content.
const vendors = ['AWS', 'Microsoft Azure', 'Google Cloud']

export const TrustBar: React.FC = () => {
  return (
    <div className="bg-[oklch(21%_0.03_258deg)] py-6">
      <div className="container flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-sm font-semibold text-white/60 tracking-wide">
          Covering certifications from
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {vendors.map((vendor) => (
            <span
              key={vendor}
              className="text-sm font-bold text-white/90 border border-white/20 rounded-full px-4 py-2"
            >
              {vendor}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2 text-sm font-semibold text-chart-5">
          <CheckCircle2 className="w-4 h-4" />
          Free &mdash; no signup required
        </div>
      </div>
    </div>
  )
}
