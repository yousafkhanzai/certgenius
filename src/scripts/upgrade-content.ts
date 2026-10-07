import type { Payload } from 'payload'

// One-time data upgrade for the Phase 1 data model, safe to run on every
// deploy: it only touches rows that haven't been upgraded yet and never
// deletes anything (the old fields stay in place, hidden).
//
// 1. Certifications saved before "examStatus" existed become "active".
// 2. Questions stored in the old flexible-options format are copied into the
//    new A-D fields (options -> optionA..D, topic -> domainName,
//    beginner/intermediate/advanced -> easy/medium/hard).

const LEVELS: Record<string, 'easy' | 'medium' | 'hard'> = {
  beginner: 'easy',
  intermediate: 'medium',
  advanced: 'hard',
}
const LETTERS = ['A', 'B', 'C', 'D'] as const

export async function upgradeContent(payload: Payload): Promise<void> {
  const certs = await payload.db.pool.query(
    `UPDATE certifications SET exam_status = 'active' WHERE exam_status IS NULL`,
  )
  const certVersions = await payload.db.pool.query(
    `UPDATE _certifications_v SET version_exam_status = 'active' WHERE version_exam_status IS NULL`,
  )
  if (certs.rowCount || certVersions.rowCount) {
    payload.logger.info(`Upgrade: set ${certs.rowCount} certification(s) to status "active".`)
  }

  const legacy = await payload.find({
    collection: 'questions',
    where: { optionA: { exists: false } },
    depth: 0,
    limit: 0,
    pagination: false,
    overrideAccess: true,
  })

  let upgraded = 0
  for (const q of legacy.docs) {
    const options = q.options || []
    const correctIndex = options.findIndex((o) => o.isCorrect)
    if (options.length !== 4 || correctIndex === -1) {
      payload.logger.warn(
        `Upgrade: question ${q.id} has ${options.length} options - left in the old format, please fix by hand.`,
      )
      continue
    }
    await payload.update({
      collection: 'questions',
      id: q.id,
      overrideAccess: true,
      data: {
        optionA: options[0].text,
        optionB: options[1].text,
        optionC: options[2].text,
        optionD: options[3].text,
        correctAnswer: LETTERS[correctIndex],
        domainName: q.domainName || q.topic || 'General',
        level: q.level || LEVELS[q.difficulty || ''] || 'medium',
        questionType: 'single',
      },
    })
    upgraded++
  }
  if (upgraded) payload.logger.info(`Upgrade: converted ${upgraded} question(s) to the A-D format.`)

  await ensureEthereumCertification(payload)
}

// The first certification for the question importer (spec, Phase 1). Created
// once as a DRAFT so its domains exist before importing its question file;
// it only goes live when an admin publishes it.
async function ensureEthereumCertification(payload: Payload): Promise<void> {
  const slug = 'certified-ethereum-developer'
  const existing = await payload.find({
    collection: 'certifications',
    where: { slug: { equals: slug } },
    draft: true,
    depth: 0,
    limit: 1,
    overrideAccess: true,
    select: { slug: true },
  })
  if (existing.docs.length) return

  await payload.create({
    collection: 'certifications',
    draft: true,
    overrideAccess: true,
    context: { disableRevalidate: true },
    data: {
      _status: 'draft',
      title: 'Certified Ethereum Developer',
      slug,
      vendor: 'Blockchain Council',
      examCode: 'BC-CED',
      isSiteCode: true,
      certCategory: 'blockchain',
      examStatus: 'active',
      passingScore: 60,
      examQuestionCount: 100,
      durationMinutes: 60,
      domains: [
        { name: 'Ethereum Architecture and EVM', weight: 20 },
        { name: 'Solidity Programming Language', weight: 25 },
        { name: 'Smart Contract Development and Testing', weight: 25 },
        { name: 'Web3.js and Ethers.js Integration', weight: 15 },
        { name: 'DeFi and Token Standards (ERC-20 ERC-721)', weight: 15 },
      ],
    },
  })
  payload.logger.info('Upgrade: created the Certified Ethereum Developer certification as a draft.')
}
