import React from 'react'

import { Contact, LegalPage, legalMetadata } from '@/components/site/LegalPage'

const PATH = '/affiliate-disclosure'
const TITLE = 'Affiliate disclosure'
const INTRO = 'How CertGenius stays free, and what our partner links mean.'

export default function AffiliateDisclosurePage() {
  return (
    <LegalPage path={PATH} title={TITLE} updated="15 October 2026" intro={INTRO}>
      <h2>How we keep CertGenius free</h2>
      <p>
        All practice questions, exam simulations and study guides on CertGenius are free. To pay for running the site, some
        pages show advertising, and some pages recommend video courses, hands-on labs or official training from partners.
      </p>

      <h2>What an affiliate link is</h2>
      <p>
        Some of those recommendations are affiliate links. If you click one and then buy something, the partner may pay us a
        commission. <strong>You do not pay anything extra.</strong> The price is the same as going to the partner directly.
      </p>

      <h2>How you can tell</h2>
      <ul>
        <li>
          Partner courses appear in a clearly labelled block on certification pages (&ldquo;Want video lessons or hands-on
          labs?&rdquo;), with a note that the links may earn us a commission.
        </li>
        <li>These links are marked for search engines as sponsored.</li>
        <li>Links to official vendor pages and official resources are never affiliate links.</li>
      </ul>

      <h2>Our promise</h2>
      <p>
        Commissions never change our practice questions, explanations or study guides. We only recommend courses we believe
        are useful for the exam, and you never need to buy anything to use CertGenius.
      </p>

      <h2>Questions</h2>
      <p>
        Contact us at <Contact />.
      </p>
    </LegalPage>
  )
}

export const metadata = legalMetadata(PATH, TITLE, INTRO)
