// Fixed option lists shared by the Certifications collection and the
// certification importer. Values are stored in the database, labels are what
// admins and visitors see - so labels can be reworded later without a data change.

export const CERT_CATEGORIES = [
  { label: 'Cloud AI', value: 'cloud-ai' },
  { label: 'AI Vendor', value: 'ai-vendor' },
  { label: 'AI Security and Governance', value: 'ai-security-governance' },
  { label: 'Blockchain', value: 'blockchain' },
  { label: 'Cloud General', value: 'cloud-general' },
  { label: 'Cybersecurity', value: 'cybersecurity' },
  { label: 'Data Engineering and Analytics', value: 'data-engineering-analytics' },
  { label: 'DevOps and SRE', value: 'devops-sre' },
  { label: 'Networking and IT Support', value: 'networking-it-support' },
  { label: 'Project Management', value: 'project-management' },
  { label: 'Agile and Scrum', value: 'agile-scrum' },
  { label: 'Finance and Legal', value: 'finance-legal' },
  { label: 'Healthcare', value: 'healthcare' },
  { label: 'Backend Development', value: 'backend-development' },
  { label: 'Frontend Development', value: 'frontend-development' },
  { label: 'Full Stack', value: 'full-stack' },
  { label: 'UI/UX Design', value: 'ui-ux-design' },
  { label: 'Mobile Development', value: 'mobile-development' },
  { label: 'Game Development', value: 'game-development' },
  { label: 'Enterprise Platforms', value: 'enterprise-platforms' },
] as const

export const CERT_STATUSES = [
  { label: 'Active', value: 'active' },
  { label: 'Updated', value: 'updated' },
  { label: 'New', value: 'new' },
  { label: 'Retired', value: 'retired' },
  { label: 'On hold', value: 'on-hold' },
  { label: 'Course certificate', value: 'course-certificate' },
] as const

// Imported but never shown in public listings.
export const HIDDEN_FROM_LISTINGS: CertStatus[] = ['retired', 'on-hold']

export const AFFILIATE_TYPES = [
  { label: 'Video course', value: 'video-course' },
  { label: 'Hands-on labs', value: 'hands-on-labs' },
  { label: 'Official training', value: 'official-training' },
] as const

export type CertCategory = (typeof CERT_CATEGORIES)[number]['value']
export type CertStatus = (typeof CERT_STATUSES)[number]['value']

const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')

// Accepts either the label ("DevOps and SRE") or the stored value ("devops-sre").
export function matchCategory(input: string): CertCategory | null {
  const n = normalize(input)
  const hit = CERT_CATEGORIES.find((c) => normalize(c.label) === n || c.value === n)
  return hit ? hit.value : null
}

export function matchStatus(input: string): CertStatus | null {
  const n = normalize(input)
  const hit = CERT_STATUSES.find((s) => normalize(s.label) === n || s.value === n)
  return hit ? hit.value : null
}

// Listing filter that also keeps certifications saved before `status` existed.
export const visibleInListings = {
  or: [{ examStatus: { exists: false } }, { examStatus: { not_in: HIDDEN_FROM_LISTINGS } }],
}
