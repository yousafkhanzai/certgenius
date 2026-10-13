// Site-wide FAQ. The full list is the /faq page (with FAQPage structured
// data); the homepage shows the first three questions of each group.
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
      {
        q: 'Will practising here guarantee that I pass?',
        a: 'No one can promise that. Our questions and study guides follow the official exam objectives and help you find and fix your weak domains, but the real exam uses its own questions.',
      },
      {
        q: 'Which certifications do you cover?',
        a: 'We add certifications one at a time, and only publish one when every exam domain has practice questions and a study guide. You can see everything that is ready on the Certifications page.',
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
        a: 'You can try 10 questions of every certification without an account. A free account lets you practise everything, take exam simulations and save your progress.',
      },
      {
        q: 'What if I think an answer is wrong?',
        a: 'Every question has a “Report a problem” link. Tell us what looks wrong and we will review the question.',
      },
      {
        q: 'Are the questions always in the same order?',
        a: 'No. Questions are picked at random and shuffled every time, across all exam domains, so you learn the material instead of memorising an order.',
      },
      {
        q: 'What happens if I close the page during an exam simulation?',
        a: 'Your answers are saved as you go. Open the exam again and you continue where you stopped, with the correct time left on the clock. The exam submits itself when the time runs out.',
      },
      {
        q: 'Can I practise only one exam domain?',
        a: 'Yes. With a free account you can pick a single domain and choose 10, 25, 50 or all of its questions.',
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
        a: 'A question counts as mastered once you have answered it correctly twice in a row. Your profile shows your progress and mastery for every exam domain.',
      },
      {
        q: 'How do the study guides work?',
        a: 'Each exam domain has one study guide that covers the questions in that domain. Practice questions, your results page and your bookmarks all link to the right guide.',
      },
      {
        q: 'What are bookmarks for?',
        a: 'Bookmark any question to come back to it later. Your Bookmarks page shows each saved question with its correct answer, the explanation and a link to the study guide for that topic.',
      },
      {
        q: 'What is the daily goal and streak?',
        a: 'The daily goal is the number of questions you aim to answer each day (25 by default, and you can change it in your profile). Your streak counts how many days in a row you have practised.',
      },
    ],
  },
]
