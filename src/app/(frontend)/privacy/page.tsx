import Link from 'next/link'
import React from 'react'

import { Contact, LegalPage, legalMetadata } from '@/components/site/LegalPage'

const PATH = '/privacy'
const TITLE = 'Privacy policy'
const INTRO = 'What we collect when you use CertGenius, why, and the choices you have.'

export default function PrivacyPage() {
  return (
    <LegalPage path={PATH} title={TITLE} updated="16 October 2026" intro={INTRO}>
      <h2>Who we are</h2>
      <p>
        CertGenius is a free website for practising IT certification exams. In this policy, &ldquo;we&rdquo; means CertGenius.
        You can contact us about privacy at <Contact />.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Your account:</strong> your email address, your name if you add one, your country, and your password. Passwords are stored
          only in scrambled (hashed) form, so nobody at CertGenius can read them.
        </li>
        <li>
          <strong>Your study activity:</strong> the questions you answer and the answers you choose, your practice sessions and
          exam simulations with their scores and times, your bookmarks, your daily goal and your study streak.
        </li>
        <li>
          <strong>Problem reports:</strong> the message you write when you report a problem with a question.
        </li>
        <li>
          <strong>Approximate location:</strong> when you sign up and log in, we record the country and city your internet
          connection comes from (worked out by our hosting provider from your IP address; no GPS). You can change your country
          in your profile at any time. We use it to understand where our students are.
        </li>
        <li>
          <strong>When you were last active</strong> on the site.
        </li>
        <li>
          <strong>Technical information:</strong> like every website, our hosting provider receives your IP address and browser
          details when you visit, and keeps short-term logs to run the site and keep it secure.
        </li>
      </ul>
      <p>We do not ask for payment details. CertGenius is free.</p>

      <h2>How we use it</h2>
      <ul>
        <li>To run your account and show your progress, readiness score, mastery, bookmarks and exam history.</li>
        <li>
          To show anonymous statistics such as &ldquo;% of students chose this&rdquo; under an answer. These are totals across
          all students and never show who chose what.
        </li>
        <li>To fix questions that students report as wrong.</li>
        <li>To keep the site secure, for example by blocking repeated wrong passwords.</li>
      </ul>
      <p>We do not sell your personal information.</p>

      <h2>Who else handles it</h2>
      <p>We use trusted providers to run the site. They handle data for us and only on our instructions:</p>
      <ul>
        <li>Vercel, which hosts the website.</li>
        <li>Neon, which hosts our database.</li>
      </ul>
      <p>
        If we show advertising, it will come from Google AdSense, and only with the choices you make in our cookie banner. See
        our <Link href="/cookie-policy">cookie policy</Link>. Links to courses from partners are explained in our{' '}
        <Link href="/affiliate-disclosure">affiliate disclosure</Link>; partners do not receive your account details from us.
      </p>

      <h2>How long we keep it</h2>
      <p>
        We keep your account and study activity for as long as your account exists, so your progress is there when you come
        back. If you ask us to delete your account, we delete it together with your study activity and bookmarks. Anonymous
        totals (such as how many students chose each answer) are kept because they cannot identify you.
      </p>

      <h2>Your rights</h2>
      <p>
        Depending on where you live (for example in the UK or the European Union), you can ask to see the personal information
        we hold about you, correct it, delete it, or receive a copy of it. You can also object to how we use it. To do any of
        this, contact us at <Contact /> from the email address on your account. You can also complain to your local data
        protection authority.
      </p>

      <h2>Security</h2>
      <p>
        The site is served over an encrypted connection (HTTPS). Passwords are hashed, accounts are locked for a while after
        repeated wrong passwords, and only you can see your own study activity.
      </p>

      <h2>Children</h2>
      <p>CertGenius is meant for people aged 16 and over. We do not knowingly collect information from younger children.</p>

      <h2>Changes</h2>
      <p>If we change this policy, we will update the date at the top of this page.</p>
    </LegalPage>
  )
}

export const metadata = legalMetadata(PATH, TITLE, INTRO)
