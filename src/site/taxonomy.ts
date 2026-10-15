import {
  Blocks,
  Bot,
  Building2,
  ClipboardList,
  Cloud,
  CloudCog,
  Database,
  Gamepad2,
  GitBranch,
  HeartPulse,
  Layers,
  Lock,
  Monitor,
  Network,
  PenTool,
  RefreshCw,
  Scale,
  Server,
  ShieldCheck,
  Smartphone,
  type LucideIcon,
} from 'lucide-react'

import { CERT_CATEGORIES, type CertCategory } from '@/collections/Certifications/options'
import { listedCertifications, type CertCard } from './data'

// Category and vendor pages. PUBLISHING RULE: built only from published,
// listed certifications that have questions, so a category or vendor page
// exists only once it has something to practise.

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  'cloud-ai': CloudCog,
  'ai-vendor': Bot,
  'ai-security-governance': ShieldCheck,
  blockchain: Blocks,
  'cloud-general': Cloud,
  cybersecurity: Lock,
  'data-engineering-analytics': Database,
  'devops-sre': GitBranch,
  'networking-it-support': Network,
  'project-management': ClipboardList,
  'agile-scrum': RefreshCw,
  'finance-legal': Scale,
  healthcare: HeartPulse,
  'backend-development': Server,
  'frontend-development': Monitor,
  'full-stack': Layers,
  'ui-ux-design': PenTool,
  'mobile-development': Smartphone,
  'game-development': Gamepad2,
  'enterprise-platforms': Building2,
}

export const categoryIcon = (value: string): LucideIcon => CATEGORY_ICONS[value] || Layers

// "Blockchain Council" -> "blockchain-council", "AWS" -> "aws".
export const vendorSlug = (name: string) =>
  name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

export const categoryHref = (value: string) => `/categories/${value}`
export const vendorHref = (name: string) => `/vendors/${vendorSlug(name)}`

const byTitle = (a: CertCard, b: CertCard) => a.title.localeCompare(b.title)

async function readyCertifications() {
  return (await listedCertifications()).filter((c) => c.questions > 0)
}

export async function publishedCategories() {
  const certs = await readyCertifications()
  return CERT_CATEGORIES.map((cat) => ({
    value: cat.value as CertCategory,
    label: cat.label as string,
    certs: certs.filter((c) => c.category === cat.value).sort(byTitle),
  })).filter((cat) => cat.certs.length > 0)
}

export async function publishedVendors() {
  const certs = await readyCertifications()
  const map = new Map<string, { name: string; slug: string; certs: CertCard[] }>()
  for (const c of certs) {
    if (!c.vendor) continue
    const slug = vendorSlug(c.vendor)
    if (!slug) continue
    const entry = map.get(slug) || { name: c.vendor, slug, certs: [] }
    entry.certs.push(c)
    map.set(slug, entry)
  }
  return [...map.values()].map((v) => ({ ...v, certs: v.certs.sort(byTitle) })).sort((a, b) => a.name.localeCompare(b.name))
}
