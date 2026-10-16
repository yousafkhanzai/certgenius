/**
 * Builds the Excel templates offered on Admin > Import spreadsheets:
 *   public/templates/certgenius-certification-template.xlsx  (all certification sheets)
 *   public/templates/certgenius-questions-template.xlsx
 * Re-run after changing a column layout in src/import/columns.ts:
 *   npx tsx src/scripts/make-templates.ts
 */
import { mkdirSync, writeFileSync } from 'fs'
import { strToU8, zipSync } from 'fflate'

import {
  CERT_COLUMNS,
  CERT_OPTIONAL_COLUMNS,
  DOMAIN_COLUMNS,
  PAGE_SHEETS,
  QUESTION_COLUMNS,
  QUESTION_OPTIONAL_COLUMNS,
} from '../import/columns'

type Sheet = { name: string; rows: string[][] }

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const col = (n: number) => {
  let s = ''
  for (n++; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s
  return s
}

function sheetXml(rows: string[][]) {
  const body = rows
    .map(
      (r, i) =>
        `<row r="${i + 1}">${r
          .map((v, c) => `<c r="${col(c)}${i + 1}" t="inlineStr"${i === 0 ? ' s="1"' : ''}><is><t xml:space="preserve">${esc(v)}</t></is></c>`)
          .join('')}</row>`,
    )
    .join('')
  const widths = rows[0].map((_, c) => `<col min="${c + 1}" max="${c + 1}" width="${c === 0 ? 30 : 28}" customWidth="1"/>`).join('')
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${widths}</cols><sheetData>${body}</sheetData></worksheet>`
}

function workbook(sheets: Sheet[]): Uint8Array {
  const files: Record<string, Uint8Array> = {
    '[Content_Types].xml': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets
      .map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`)
      .join('')}</Types>`),
    '_rels/.rels': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`),
    'xl/workbook.xml': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets
      .map((s, i) => `<sheet name="${esc(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
      .join('')}</sheets></workbook>`),
    'xl/_rels/workbook.xml.rels': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets
      .map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`)
      .join('')}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`),
    'xl/styles.xml': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="2"><xf fontId="0"/><xf fontId="1" applyFont="1"/></cellXfs></styleSheet>`),
  }
  sheets.forEach((s, i) => (files[`xl/worksheets/sheet${i + 1}.xml`] = strToU8(sheetXml(s.rows))))
  return zipSync(files)
}

const SLUG = 'certified-ethereum-developer'

const certification: Sheet[] = [
  {
    name: 'Certifications',
    rows: [
      [...CERT_COLUMNS, ...CERT_OPTIONAL_COLUMNS],
      [
        'Certified Ethereum Developer',
        'BC-CED',
        'Blockchain Council',
        SLUG,
        'Blockchain',
        'Active',
        'Practise Ethereum architecture, Solidity, smart contract testing, Web3 integration and token standards.',
        '60',
        '100',
        '60',
        'Online proctored',
        'https://www.blockchain-council.org/certifications/certified-ethereum-developer/',
      ],
    ],
  },
  {
    name: 'Domains',
    rows: [
      [...DOMAIN_COLUMNS],
      [SLUG, 'Ethereum Architecture and EVM', '20', 'https://certgenius.vercel.app/posts/ethereum-architecture-evm-gas'],
      [SLUG, 'Solidity Programming Language', '25', 'https://certgenius.vercel.app/posts/solidity-fundamentals'],
      [SLUG, 'Smart Contract Development and Testing', '25', 'https://certgenius.vercel.app/posts/smart-contract-testing-security'],
      [SLUG, 'Web3.js and Ethers.js Integration', '15', 'https://certgenius.vercel.app/posts/ethers-js-web3-integration'],
      [SLUG, 'DeFi and Token Standards (ERC-20 ERC-721)', '15', 'https://certgenius.vercel.app/posts/erc-token-standards-defi'],
    ],
  },
  {
    name: PAGE_SHEETS.page.sheet,
    rows: [
      [...PAGE_SHEETS.page.columns],
      [
        SLUG,
        'The Certified Ethereum Developer exam checks that you can build, test and ship smart contracts on Ethereum.\n\nIt covers how the EVM executes code and charges gas, writing secure Solidity, testing with Hardhat or Foundry, connecting apps with ethers.js, and the ERC-20 and ERC-721 token standards.',
        'Developers who already know one programming language and want to prove they can build on Ethereum.',
        'Blockchain Council launched this certification to give employers a vendor-neutral benchmark for Ethereum development skills.',
        'Smart contract developer | Blockchain engineer | Web3 full-stack developer',
        'CertGenius Editorial Team',
        'Exam content writer',
        'A. Reviewer',
        'Certified Ethereum Developer',
        'Certified Blockchain Developer',
        'certified-blockchain-developer',
      ],
    ],
  },
  {
    name: PAGE_SHEETS.plan.sheet,
    rows: [
      [...PAGE_SHEETS.plan.columns],
      [SLUG, 'Week 1', 'Ethereum and the EVM', 'Read the Ethereum Architecture guide and practise that domain until you score 80%.'],
      [SLUG, 'Week 2', 'Solidity', 'Work through the Solidity guide, then 50 practice questions on that domain.'],
      [SLUG, 'Week 3', 'Testing, Web3 and tokens', 'Cover the remaining three guides and practise each domain.'],
      [SLUG, 'Week 4', 'Exam simulations', 'Take two full exam simulations and review every question you missed.'],
    ],
  },
  {
    name: PAGE_SHEETS.compare.sheet,
    rows: [
      [...PAGE_SHEETS.compare.columns],
      [SLUG, 'Level', 'Intermediate', 'Beginner'],
      [SLUG, 'Focus', 'Ethereum and Solidity', 'Blockchain concepts on several platforms'],
      [SLUG, 'Questions', '100', '100'],
      [SLUG, 'Time', '60 minutes', '120 minutes'],
    ],
  },
  {
    name: PAGE_SHEETS.resources.sheet,
    rows: [
      [...PAGE_SHEETS.resources.columns],
      [SLUG, 'Official exam page', 'Objectives, format and registration.', 'https://www.blockchain-council.org/'],
      [SLUG, 'Solidity documentation', 'The official language reference.', 'https://docs.soliditylang.org/'],
    ],
  },
  {
    name: PAGE_SHEETS.courses.sheet,
    rows: [
      [...PAGE_SHEETS.courses.columns],
      [SLUG, 'Video course', 'Partner name', 'Ethereum and Solidity: the complete developer course', 'https://example.com/your-affiliate-link', '40 hours of video', 'Build 5 real projects'],
    ],
  },
  {
    name: PAGE_SHEETS.faqs.sheet,
    rows: [
      [...PAGE_SHEETS.faqs.columns],
      [SLUG, 'How hard is the Certified Ethereum Developer exam?', 'It is an intermediate exam. Most people with some programming experience need 4-6 weeks of study.'],
      [SLUG, 'Do I need to know Solidity before starting?', 'No. The study guides start from the basics, but you should be comfortable with at least one programming language.'],
    ],
  },
]

const questions: Sheet[] = [
  {
    name: 'Questions',
    rows: [
      [...QUESTION_COLUMNS, ...QUESTION_OPTIONAL_COLUMNS],
      [
        SLUG,
        'Solidity Programming Language',
        'Which keyword lets a Solidity function read contract state without changing it?',
        'pure',
        'view',
        'payable',
        'external',
        'B',
        'A view function can read state variables but cannot modify them, so calling it off-chain costs no gas.',
        'Think about reading versus writing.',
        'easy',
        'single',
        '/posts/solidity-fundamentals',
        'https://docs.soliditylang.org/en/latest/contracts.html#view-functions',
        'Wrong: pure functions cannot even read state.',
        'Right: view functions read state without modifying it.',
        'Wrong: payable is about receiving Ether.',
        'Wrong: external only controls who can call the function.',
      ],
    ],
  },
]

mkdirSync('public/templates', { recursive: true })
writeFileSync('public/templates/certgenius-certification-template.xlsx', workbook(certification))
writeFileSync('public/templates/certgenius-questions-template.xlsx', workbook(questions))
console.log('Templates written to public/templates/')
