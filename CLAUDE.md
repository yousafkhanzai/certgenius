@AGENTS.md

You are building CertGenius, a free IT certification exam-prep website. I am not a developer. Explain everything in plain English, give me exact steps when I need to do something (click this, paste that), and never assume I know technical terms.

FIRST: save this whole message as CLAUDE.md in the project root so you remember it every session. Then do PHASE 0 only and stop.

=== WORKING RULES ===
- The site is already LIVE on Vercel with a Neon Postgres database. Never break the live site and never delete existing data.
- Work in small phases. At the end of each phase: run the build locally, fix all errors, summarise what changed in plain English, tell me how to test it, then commit and push to GitHub (Vercel deploys automatically).
- Before any database change, explain it and ask me first.
- Production build must use webpack, not Turbopack (Turbopack had an intermittent PostCSS crash).
- If something in this spec is unclear or conflicts with the existing code, ask me instead of guessing.

=== EXISTING PROJECT ===
- Next.js 16 + Payload CMS 3 admin, Neon Postgres, deployed on Vercel. Domain is registered at Namecheap.
- Existing collections: Certifications, Practice Questions, plus blog Posts and Pages from the template.
- Existing features: practice quiz engine, sitewide JSON-LD schema (Organization, WebSite, BreadcrumbList, Course, Article), and admin content-freshness reminders (stale after 3 months; may not be deployed yet).
- Existing certifications: AWS AI Practitioner, Microsoft Azure AI Fundamentals AI-900 (now RETIRED, replaced by AI-901), Google Cloud Professional ML Engineer.

=== PHASE 0: AUDIT (do this now, then stop) ===
Read the codebase and report in plain English: what exists, what works, what is missing versus this spec, anything risky, and your proposed plan for Phase 1. Do not change any files except creating CLAUDE.md.

=== DESIGN SYSTEM ===
- Fonts: Geist (all UI and headings, weights 400–800) and Geist Mono (timers, exam codes, keyboard keys).
- Colors: ink #0B1220, page background #F6F7F9, surface #FFFFFF, muted text #475467, body text #344054, border #E4E7EC, input border #D0D5DD, primary blue #2B44E8 (hover #1A2DB0, soft #EEF1FF), mint accent #7CF2B0 (on dark backgrounds), success #067647 / bg #ECFDF3, error #B42318 / bg #FEF3F2, warning #B54708 / bg #FFFAEB.
- Style: clean, premium, generous spacing, rounded cards (radius 14–24px), subtle shadows, dark navy hero sections. Logo: dark rounded square with a white checkmark + "CertGenius" wordmark.
- Must work perfectly on mobile. Accessible: real buttons and links, labels, visible focus, good contrast.
- Add a dark mode toggle (header and footer).

=== DATA MODEL ===
CERTIFICATIONS: name, slug, vendor, examCode, isSiteCode (true when vendor has no official code, e.g. BC-CED; show label "CertGenius code"), category (one of 20: Cloud AI, AI Vendor, AI Security and Governance, Blockchain, Cloud General, Cybersecurity, Data Engineering and Analytics, DevOps and SRE, Networking and IT Support, Project Management, Agile and Scrum, Finance and Legal, Healthcare, Backend Development, Frontend Development, Full Stack, UI/UX Design, Mobile Development, Game Development, Enterprise Platforms), status (Active, Updated, New, Retired, On hold, Course certificate), replacedBy (relation, for retired exams), passScore %, examQuestionCount, durationMinutes, delivery, officialUrl, domains (array: name, weight %, studyGuide relation to a Post), overview, whoItsFor, background, roles, studyPlan (weeks: label, title, text), comparisonRows, officialResources (name, description, url), authorName/role, reviewerName/credential, affiliateCourses (type: Video course / Hands-on labs / Official training, partner, title, url, 2 bullet points), relatedCertifications, faqs (question, answer), publishedAt, updatedAt. NO price fields shown anywhere.
QUESTIONS: certification (by slug), domain_name (must exactly match one of the certification's domain names), question_text, option_a–d, correct_answer (A–D), explanation, why_a, why_b, why_c, why_d (optional: why each option is right/wrong), hint, difficulty (easy/medium/hard), question_type (single), blog_post_url, reference_url.
STUDENTS: email + password sign-up/login (add Google sign-in if simple). Store attempts, answers, bookmarks, streak, daily goal (default 25 questions).
Also: AnswerStats (count of each option chosen per question), ProblemReports (question, student, message, status).
Index questions by certification + domain. There will be 15,000+ questions; never load them all at once.

=== QUESTION IMPORT (admin) ===
- Upload .xlsx or .csv using the exact column order in content/certified-ethereum-developer-questions.xlsx: certification_slug, domain_name, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, hint, difficulty, question_type, blog_post_url, reference_url, plus optional why_a–why_d at the end.
- Text in the files uses semicolons where commas were (importer quirk). Import text as-is.
- Before importing, show a preview and a validation report: unknown certification slug, domain not matching that certification, missing fields, invalid correct_answer, duplicate questions. Only import valid rows; never create duplicates.
- Also an admin import for certifications from content/CertGenius-Topics-and-Subtopics.xlsx (sheet "Topics and Subtopics": name, exam code, vendor, slug, category, status). Retired and On hold certifications are imported but not shown in listings.

=== ACCESS ===
- Login is required to take quizzes. Guests can answer the first 10 questions of each certification, then see a sign-up prompt that keeps their progress.
- Sample questions on certification pages and the homepage "try a question" card work without login.

=== QUIZ: PRACTICE MODE ===
Options: domain (All or one), number of questions (10, 25, 50, All). After answering: correct/incorrect state, the correct answer highlighted, explanation, why each wrong option is wrong (if why_ columns exist), official reference link, a "Study guide" card linking to blog_post_url, a "Remember" key takeaway line, and "% of students chose this" under each option (only show once a question has 30+ answers). Hint button before answering. Bookmark button. Session tracker (green/red/grey blocks). Report a problem button. Keyboard: 1–4 choose, B bookmark, Enter next.

=== QUIZ: EXAM SIMULATION ===
Uses the certification's examQuestionCount, durationMinutes and passScore. Questions picked randomly but distributed by domain weight. Live countdown card (big MM:SS, bar, pace tip "about Xs per remaining question"); turns amber under 10 minutes and red under 5; Hide/Show timer button; header mini-timer matches. Auto-submits at 00:00. Cross-out button per option. Bookmark button. Previous/Next. Keyboard: 1–4, B, X, Enter, arrow keys. No hints, no explanations until the end, NO ADS. Save progress continuously so a refresh resumes the attempt with the correct remaining time.
Do NOT build: question navigator grid, flag button, confidence rating, smart review, AI tutor.

=== RESULTS PAGE ===
Score ring with pass mark tick, Passed/Failed, "best score yet" message when true, last 5 exam scores chart with pass line, time used, average seconds per question, per-domain bars against the pass line with change versus previous attempt (weak domains in orange), a study plan ordering the certification's study guides by how many questions were missed in each domain, bookmarked questions from this attempt, buttons: Review all answers, Practice missed questions, Take another exam.

=== STUDENT AREA ===
Profile: readiness score (average of last 3 exam simulations), mastery per domain (mastered = answered correctly the last 2 times), streak, daily goal, exam history. Bookmarks page: each saved question with correct answer, explanation and a "Study this topic" link to its blog post; filter by certification; remove bookmark.

=== PUBLIC PAGES ===
HOMEPAGE (order): header (Certifications, Vendors, Study guides, FAQ, search, dark mode, Log in / Sign up, or avatar when logged in); dark hero with "100% free · Every answer explained" badge, headline, Start practicing free + Browse certifications buttons, live stats (total questions, certifications, vendors, study guides — all calculated automatically), and an interactive "Try a question" card with a ticking timer; logged-in "Welcome back" strip (readiness, streak, shortcuts to Mock exam, Domain practice with weakest domain, Bookmarks, Exam history); Pick a certification (6 popular cards: code, vendor, questions, domains, minutes, pass score); Just added (4 newest published certifications automatically, plus "Coming soon" dashed cards for status New without questions); Browse by vendor (with counts); Browse by category (20, with icons and counts); Built to mirror the real exam (6 features + "Original questions written from official exam objectives, never exam dumps" + Report a wrong answer); Latest from the blog; FAQ (3 groups, accordion, FAQPage schema); sign-up banner; footer (Popular exams, Categories, Resources, Company and Legal, dark mode, vendor trademark disclaimer).
CERTIFICATION PAGE (order): breadcrumb; dark hero (exam code, Active/Retired badge, Updated date, H1 "[Name] practice exams", intro, Take a mock exam + Practice by domain buttons, "Try 3 sample questions first" link); Exam at a glance box (vendor, code, questions, time, pass score, delivery, our question bank size, official link); sticky jump bar; About the exam (overview + who it's for + background + roles) with author and reviewer box; Exam domains (weight bars, question counts, Practice and Study guide buttons); Topics and tools on the exam (entity chips grouped by domain, linking to guide sections); one ad slot; 3 sample questions with Show answer; Study guides; 4-week study plan; How it compares table + certification path; affiliate "Want video lessons or hands-on labs?" block (links rel="sponsored nofollow", affiliate disclosure line); Official resources; FAQ; related certifications; vendor disclaimer. Retired certifications show a clear "This exam is retired" notice linking to the replacement.
ALSO: category pages, vendor pages, blog post template with a YouTube video embed field (videoUrl) placed near the top, login/sign-up pages, legal pages (Privacy policy, Terms of use, Affiliate disclosure, Cookie policy).

=== SEO ===
Metadata, canonical URLs, XML sitemap, robots. JSON-LD: Organization, WebSite with SearchAction, BreadcrumbList, Course (certification pages), FAQPage, Quiz (sample questions), Article and VideoObject (blog posts). Fast pages: static generation where possible.

=== MONETISATION ===
Google AdSense slots ONLY on homepage, certification, category, vendor and blog pages. Never on quiz, exam, results, bookmarks or profile pages. Cookie consent banner with Google Consent Mode v2 (required for EU/UK). Affiliate course links managed per certification in the admin.

=== PHASES ===
0 Audit (now). 1 Data model + question/certification import + student accounts. 2 Practice mode + exam simulation. 3 Results, profile, bookmarks, problem reports. 4 Homepage + certification page. 5 Category, vendor, blog template, legal pages, SEO schema, sitemap. 6 Ads slots, cookie consent, affiliate blocks, performance and mobile polish.
After Phase 1, import content/certified-ethereum-developer-questions.xlsx as the first test (certification slug certified-ethereum-developer, exam code BC-CED, vendor Blockchain Council, pass score 60%, 100 questions, 60 minutes, 5 domains: Ethereum Architecture and EVM 20%, Solidity Programming Language 25%, Smart Contract Development and Testing 25%, Web3.js and Ethers.js Integration 15%, DeFi and Token Standards (ERC-20 ERC-721) 15%).
