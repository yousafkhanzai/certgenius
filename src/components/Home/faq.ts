// Homepage FAQ (three groups). Also published as FAQPage structured data.
export const HOME_FAQ: { group: string; items: { q: string; a: string }[] }[] = [
  {
    group: 'About CertGenius',
    items: [
      {
        q: 'Is CertGenius really free?',
        a: 'Yes. Every practice question, exam simulation and study guide is free. There are no subscriptions and no paywalls.',
      },
      {
        q: 'Where do the questions come from?',
        a: 'Our questions are original. They are written from each vendor’s official exam objectives and are never taken from real exams or exam dumps.',
      },
      {
        q: 'Is CertGenius affiliated with AWS, Microsoft, CompTIA or other vendors?',
        a: 'No. CertGenius is an independent study resource. Vendor names, exam names and exam codes are trademarks of their owners.',
      },
    ],
  },
  {
    group: 'Practice and exam simulations',
    items: [
      {
        q: 'What is the difference between practice mode and an exam simulation?',
        a: 'Practice mode shows the correct answer, an explanation and a study guide right after each question, and you can ask for a hint. An exam simulation uses the real exam’s number of questions, time limit and pass score, and shows your results and explanations only at the end.',
      },
      {
        q: 'Do I need an account?',
        a: 'You can try the first 10 questions of every certification without an account. A free account lets you practise everything, take exam simulations and save your progress.',
      },
      {
        q: 'What if I think an answer is wrong?',
        a: 'Every question has a “Report a problem” link. Tell us what looks wrong and we will review the question.',
      },
    ],
  },
  {
    group: 'Progress and study guides',
    items: [
      {
        q: 'How is my exam readiness calculated?',
        a: 'Readiness is the average score of your last three exam simulations for that certification, shown against its pass score.',
      },
      {
        q: 'What does “mastered” mean?',
        a: 'A question counts as mastered once you have answered it correctly twice in a row. Your profile shows mastery for every exam domain.',
      },
      {
        q: 'How do the study guides work?',
        a: 'Each exam domain has one study guide that covers the questions in that domain. Practice questions, your results page and your bookmarks all link to the right guide.',
      },
    ],
  },
]
