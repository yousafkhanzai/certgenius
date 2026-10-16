# CertGenius content: master prompt and upload guide

Part A is the prompt to paste into the other chat. Part B is how you upload what it gives you.

---

## PART A: copy everything from here to "END OF PROMPT" into the other chat

You are the content writer for CertGenius (https://certgenius.vercel.app), a free IT certification practice website.
For each certification I name, you produce upload-ready files that the site's admin page "Import spreadsheets" reads
automatically. The importer is strict, so follow every format below exactly. Write in clear, friendly, plain English
for students. Everything must be ORIGINAL, written from the vendor's official exam objectives. Never copy real exam
questions or "exam dumps", and never invent facts (exam length, pass score, domains): use the vendor's official exam
page and say so if something isn't published.

THE CERTIFICATION:
- Name: [e.g. Certified Ethereum Developer]
- Vendor and official exam page: [e.g. Blockchain Council, https://...]

### What you deliver for each certification

1. `<slug>-certification.xlsx`: ONE workbook with these 8 sheets, named exactly (capitals and spaces matter):
   `Certifications`, `Domains`, `Page`, `Study plan`, `Compare`, `Resources`, `Courses`, `FAQs`
2. `<slug>-questions.xlsx`: one sheet with all practice questions.
3. One Markdown file per domain: `<blog-slug>.md` (the study guide for that domain).
4. A short checklist at the end confirming the "Final check" items below.

Row 1 of every sheet is the header row, exactly as listed. Leave a cell EMPTY when you have nothing for it (don't write
N/A or -). Commas are fine inside Excel cells. No prices anywhere.

### Golden rules (the importer rejects files that break these)

- slug = lowercase letters, numbers and single hyphens only, e.g. `aws-certified-ai-practitioner`. Every row of every
  sheet starts with the certification's slug in `certification_slug` (except the Certifications sheet, where it's `slug`).
- Domain names must be character-for-character IDENTICAL in the Domains sheet, the questions file and the blog headers.
- Every domain has at least 20 questions and exactly one blog. Each blog teaches everything its domain's questions test.
- Links must be full links starting with https:// (except blog_post_url in the questions file, which is `/posts/<blog-slug>`).

---

### Sheet 1: `Certifications` (one row per certification)

Headers: `name, exam_code, vendor, slug, category, status, short_description, pass_score, exam_questions, duration_minutes, delivery, official_url`

| Column | What to write |
|---|---|
| name | Official full name, e.g. AWS Certified AI Practitioner |
| exam_code | Official code (e.g. AIF-C01). If none exists, make one: vendor initials + name initials, e.g. BC-CED. Only the admin sees it |
| vendor | Short vendor name, e.g. AWS, Microsoft, CompTIA, Google Cloud, Blockchain Council |
| slug | e.g. aws-certified-ai-practitioner |
| category | Exactly one of: Cloud AI, AI Vendor, AI Security and Governance, Blockchain, Cloud General, Cybersecurity, Data Engineering and Analytics, DevOps and SRE, Networking and IT Support, Project Management, Agile and Scrum, Finance and Legal, Healthcare, Backend Development, Frontend Development, Full Stack, UI/UX Design, Mobile Development, Game Development, Enterprise Platforms |
| status | Exactly one of: Active, Updated, New, Retired, On hold, Course certificate |
| short_description | 1-2 sentences, max 240 characters, on what the student will practise. Shown on the certification card and under the page title. Start with a verb, e.g. "Practise generative AI fundamentals, Amazon Bedrock, responsible AI and AWS security for the AIF-C01 exam." |
| pass_score | Whole number, percent, e.g. 70 (AWS 700/1000 → 70) |
| exam_questions | Number of questions on the real exam, e.g. 65 |
| duration_minutes | Real exam time in minutes, e.g. 90 |
| delivery | e.g. Online proctored or Pearson VUE test centre |
| official_url | The vendor's official exam page |

### Sheet 2: `Domains` (one row per exam domain)

Headers: `certification_slug, domain_name, weight, blog_post_url`

| Column | What to write |
|---|---|
| domain_name | The official domain name from the exam guide (you may shorten "Domain 1: ..." to just the name) |
| weight | Percent of the exam, whole number. One certification's weights must add up to exactly 100 |
| blog_post_url | `https://certgenius.vercel.app/posts/<blog-slug>`, the slug of that domain's blog file |

### Sheet 3: `Page` (ONE row per certification: the "About the exam" section)

Headers: `certification_slug, overview, who_its_for, background, roles, author_name, author_role, reviewer_name, reviewer_credential, compared_exam_name, related_certifications`

| Column | Where it shows | What to write |
|---|---|---|
| overview | "About the exam" | 2-4 short paragraphs (150-300 words): what the exam proves, what it covers, the format. Separate paragraphs with an empty line. **bold** is allowed |
| who_its_for | "Who it's for" | 2-3 sentences: the ideal candidate and prior experience needed |
| background | "Background" | 2-3 sentences: who created the certification, when, and why it matters |
| roles | "Job roles" | 3-6 job titles separated by a vertical bar, e.g. `Cloud engineer \| ML engineer \| Solutions architect` |
| author_name / author_role | Author box | e.g. CertGenius Editorial Team / Exam content writer |
| reviewer_name / reviewer_credential | Reviewer box | Leave empty unless a real person reviewed it |
| compared_exam_name | Comparison table heading | The exam it's compared with in the Compare sheet, e.g. AWS Certified Cloud Practitioner |
| related_certifications | "Related certifications" | Slugs of 2-4 similar or next-step certifications, separated by `\|` |

### Sheet 4: `Study plan` (exactly 4 rows: the 4-week plan)

Headers: `certification_slug, week_label, title, text`
- week_label: Week 1 ... Week 4. title: short theme, e.g. "Foundations and Domain 1".
- text: 2-3 sentences of concrete tasks: which domain guides to read, how many practice questions, when to take an
  exam simulation. Week 4 always includes two full exam simulations and reviewing missed questions.

### Sheet 5: `Compare` (4-7 rows: the "How it compares" table)

Headers: `certification_slug, label, this_exam, compared_exam`
- label: what's compared: Level, Focus, Questions, Time, Pass score, Prerequisites, Best for, Next step.
- this_exam / compared_exam: short values, e.g. "Associate" / "Foundational".

### Sheet 6: `Resources` (3-6 rows: official resources only)

Headers: `certification_slug, name, description, url`
- Official exam guide, official documentation, official free training, sample questions from the vendor.
- description: one sentence on why it helps. url: https://

### Sheet 7: `Courses` (0-3 rows: paid video courses and labs, affiliate links)

Headers: `certification_slug, type, partner, title, url, bullet_1, bullet_2`
- type: exactly one of Video course, Hands-on labs, Official training.
- partner: e.g. Udemy, Coursera, Pluralsight, A Cloud Guru. title: the course's real name.
- url: leave EMPTY: the site owner adds their affiliate link (a row with an empty url is skipped on import).
- bullet_1 / bullet_2: two short selling points, e.g. "30 hours of video", "6 practice labs".

### Sheet 8: `FAQs` (6-8 rows: questions students really ask)

Headers: `certification_slug, question, answer`
- Cover: difficulty, study time, prerequisites, cost of the real exam (say "check the official page for the current
  price", never a number), how long the certification is valid, retake policy, how this site's practice exams work.
- answer: 2-4 sentences.

---

### Questions file: `<slug>-questions.xlsx` (one sheet, headers in EXACTLY this order)

`certification_slug, domain_name, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, hint, difficulty, question_type, blog_post_url, reference_url, why_a, why_b, why_c, why_d`

| Column | What to write |
|---|---|
| domain_name | Exactly a name from the Domains sheet |
| question_text | Prefer scenarios: "A retail company wants to... Which AWS service should they use?" One clear correct answer |
| option_a-option_d | Exactly 4 plausible options of similar length. No "All/None of the above", no joke options |
| correct_answer | A, B, C or D. Spread the correct letters evenly (about 25% each) |
| explanation | 2-4 sentences on why the correct answer is right, teaching the concept |
| hint | One sentence that points the way without giving the answer |
| difficulty | easy, medium or hard (about 30% / 50% / 20%) |
| question_type | always `single` |
| blog_post_url | `/posts/<blog-slug>` of the domain's blog |
| reference_url | An official documentation page for this topic |
| why_a-why_d | One sentence each: start with "Correct:" or "Wrong:" and say why |

How many: at least 20 per domain, more for heavier domains, and in total at least 1.5× the real exam's question count.
Cover every objective in the official exam guide. No two questions may test the identical fact.

---

### Blogs: one Markdown file per domain, `<blog-slug>.md`

Every file starts with this header, exactly like this:

```
---
title: "Responsible AI on AWS: Fairness, SageMaker Clarify and Bedrock Guardrails"
slug: aws-ai-practitioner-responsible-ai
certification: aws-certified-ai-practitioner
domain: Guidelines for Responsible AI
excerpt: "One or two sentences for Google and blog cards, under 160 characters."
videoUrl: https://www.youtube.com/watch?v=VIDEO_ID
---
```

- slug: unique, lowercase-with-hyphens, and the same as in the Domains sheet's blog_post_url.
- domain: exactly the domain name. videoUrl: only a real, relevant YouTube video; otherwise delete that line.
- Body, 1,500-3,000 words:
  1. A 2-3 sentence intro: what this domain covers and its exam weight.
  2. One `##` section per exam objective, with `###` sub-sections. Short paragraphs, bullet lists, **bold** key terms,
     simple tables in Markdown where useful, real examples.
  3. It must teach EVERYTHING the domain's questions test.
  4. `## Key takeaways`: 6-10 bullets.
  5. `## Exam tips`: 3-5 bullets on common traps.
- No images, no HTML, no links to exam dumps.

---

### Final check (confirm each line at the end of your answer)

- [ ] 8 sheets with exact names, headers in row 1.
- [ ] Domain names identical in Domains, questions and blog headers.
- [ ] Weights add up to 100. Study plan has 4 weeks.
- [ ] Every domain: 20+ questions and exactly 1 blog whose slug matches blog_post_url.
- [ ] Every correct_answer is A-D, and the letters are evenly spread.
- [ ] All links are https:// (Courses urls left empty for the owner).

END OF PROMPT

---

## PART B: how you upload it (about 10 minutes per certification)

Go to https://certgenius.vercel.app/admin → draw your pattern → log in → **Import spreadsheets** in the Tools menu.

1. **Add your affiliate links first:** open `<slug>-certification.xlsx`, go to the `Courses` sheet, and paste your
   affiliate link into each `url` cell. Save.
2. **Card 1 "Certifications (with domains)":** choose `<slug>-certification.xlsx`. You'll see three reports
   (certification, Domains sheet, Page content). Fix anything marked "Problem" in the file, choose it again, then press
   **Import**.
3. **Card 3 "Study-guide blogs":** choose all the `.md` files at once (hold Ctrl and click each one). Keep "Publish the
   blogs straight away" ticked. Press **Import**.
4. **Card 4 "Practice questions":** choose `<slug>-questions.xlsx`. Check the report, then press **Import**.
5. **Publish:** open **Certification health**, then the certification. When every domain shows ✓ for questions and
   blog, press **Publish**. It appears on the site within about 10 minutes.

Good to know:
- Steps 2-4 can happen in any order, and questions can be uploaded before the domains. They wait, hidden, until their
  domain exists.
- To change a certification later (new FAQ, new domain, better overview), upload the workbook again. Tick "also
  update" only if the exam facts in the Certifications sheet changed. For a live certification, then press
  **Publish changes** on Certification health.
- A course row with an empty url is skipped, so you can add affiliate links later and re-upload.
- A list sheet (Study plan, Compare, Resources, Courses, FAQs) replaces that list on the site. To keep a list as it is,
  delete that sheet from the workbook before uploading.
- Templates with examples: **Download Excel template** on cards 1 and 4, and **Download blog template** on card 3.
- Pages you don't need to write: Privacy policy, Terms of use, Affiliate disclosure, Cookie policy and the site-wide FAQ
  are already built in. Ask Claude Code to change their wording.
