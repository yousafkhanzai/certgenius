import Link from 'next/link'
import React from 'react'

import { Contact, LegalPage, legalMetadata } from '@/components/site/LegalPage'

const PATH = '/terms'
const TITLE = 'Terms of use'
const INTRO = 'The rules for using CertGenius. Please read them before you create an account.'

export default function TermsPage() {
  return (
    <LegalPage path={PATH} title={TITLE} updated="15 October 2026" intro={INTRO}>
      <h2>Using CertGenius</h2>
      <p>
        By using CertGenius you agree to these terms. If you do not agree, please do not use the site. CertGenius is free and
        is provided for personal study.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>Keep your password private. You are responsible for what happens in your account.</li>
        <li>Give a real email address that you can receive mail at.</li>
        <li>One account per person. Do not share accounts.</li>
      </ul>

      <h2>Fair use</h2>
      <p>Please do not:</p>
      <ul>
        <li>copy, scrape or republish our questions, explanations or study guides, in whole or in large parts;</li>
        <li>use bots or scripts to access the site, or try to get around its security or limits;</li>
        <li>use the site to break any law, or to harm other people or the site itself.</li>
      </ul>
      <p>We may suspend or close accounts that break these rules.</p>

      <h2>Our content</h2>
      <p>
        Our practice questions and study guides are original. They are written from the vendors&apos; published exam
        objectives and are never taken from real exams (&ldquo;exam dumps&rdquo;). The content belongs to CertGenius.
      </p>

      <h2>No guarantee of results</h2>
      <p>
        We work hard to keep questions accurate and up to date, but exams change and mistakes can happen. CertGenius is a
        study aid: it does not guarantee that you will pass any exam, and our scores are estimates, not official results. If
        you find a mistake, please use the &ldquo;Report a problem&rdquo; button on the question.
      </p>

      <h2>Vendors and trademarks</h2>
      <p>
        CertGenius is independent. It is not affiliated with, endorsed by or sponsored by any certification vendor. Vendor
        names, exam names and exam codes are trademarks of their respective owners and are used only to describe which exam
        our material helps you prepare for.
      </p>

      <h2>Links to other websites</h2>
      <p>
        We link to official vendor pages and to courses from partners. We are not responsible for those websites. Some
        partner links earn us a commission; see our <Link href="/affiliate-disclosure">affiliate disclosure</Link>.
      </p>

      <h2>Limits on our responsibility</h2>
      <p>
        The site is provided &ldquo;as is&rdquo;. As far as the law allows, we are not responsible for any loss caused by using
        it, or by it being unavailable. Nothing in these terms limits rights you have by law that cannot be limited.
      </p>

      <h2>Changes and contact</h2>
      <p>
        We may update these terms; the date at the top shows the latest version. Questions? Contact us at <Contact />. How we
        handle your information is explained in our <Link href="/privacy">privacy policy</Link>.
      </p>
    </LegalPage>
  )
}

export const metadata = legalMetadata(PATH, TITLE, INTRO)
