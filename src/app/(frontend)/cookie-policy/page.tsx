import Link from 'next/link'
import React from 'react'

import { Contact, LegalPage, legalMetadata } from '@/components/site/LegalPage'

const PATH = '/cookie-policy'
const TITLE = 'Cookie policy'
const INTRO = 'The small files and browser storage CertGenius uses, and how to control them.'

export default function CookiePolicyPage() {
  return (
    <LegalPage path={PATH} title={TITLE} updated="15 October 2026" intro={INTRO}>
      <h2>What cookies are</h2>
      <p>
        Cookies are small files a website saves in your browser. Websites can also keep small notes in your browser&apos;s
        storage. We use as few as possible.
      </p>

      <h2>Strictly necessary (always on)</h2>
      <p>These make the site work, so they do not need your consent:</p>
      <ul>
        <li>
          <strong>Login cookie</strong> (<code>payload-token</code>): keeps you logged in, for up to 7 days. Only set when you
          log in.
        </li>
        <li>
          <strong>Guest progress</strong> (browser storage): remembers the free questions you answered before signing up, so
          you keep that progress when you create an account. Cleared when you close the tab.
        </li>
        <li>
          <strong>Theme</strong> (browser storage): remembers whether you chose light or dark mode.
        </li>
        <li>
          <strong>Security cookies</strong> (<code>cg_gate</code>, <code>cg_known</code>): used only on the private admin area,
          never for visitors.
        </li>
      </ul>

      <h2>Advertising (only with your consent)</h2>
      <p>
        If we show ads, they come from Google AdSense. Google may use cookies to show ads and measure them. In the UK, the
        European Union and similar regions we ask for your consent first with a cookie banner, and if you say no, any ads
        shown are not personalised. Advertising cookies are never used on quiz, exam, results, bookmarks or profile pages,
        because we show no ads there. You can learn more at{' '}
        <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener noreferrer">
          how Google uses cookies in advertising
        </a>
        .
      </p>

      <h2>How to control cookies</h2>
      <ul>
        <li>Change your choice at any time from the cookie banner settings once it is available.</li>
        <li>
          Most browsers let you block or delete cookies in their settings. If you block the login cookie, you will not be able
          to stay logged in.
        </li>
      </ul>

      <h2>More information</h2>
      <p>
        See our <Link href="/privacy">privacy policy</Link>, or contact us at <Contact />.
      </p>
    </LegalPage>
  )
}

export const metadata = legalMetadata(PATH, TITLE, INTRO)
