# FARIS HAMDAN

**Full Stack Developer & AI Solutions Specialist**

Zarqa, Jordan · faresadelqd@gmail.com · plotzy.co · linkedin.com/in/fares-hamdan-428882305 · Open to Remote & International Opportunities

---

## PROFESSIONAL SUMMARY

Full stack developer and digital entrepreneur with proven experience designing, building, and shipping production grade web platforms end to end. Founder and sole engineer behind Plotzy.co, a bilingual SaaS publishing platform serving Arabic and English writers worldwide, with 100,000+ lines of TypeScript, 257 REST endpoints, 30+ database tables, and a full AI stack covering writing assistance, audiobook narration, manuscript analysis, and cover generation. Holds advanced certifications from Anthropic, Google, IBM, Cisco, Apple, Stanford Online, University of Cambridge, and Huawei. Currently pursuing a Bachelor's in Business Information Technology at The Hashemite University. Recognized for delivering complex projects independently, combining technical depth with strong product and business acumen.

---

## FEATURED PROJECT

### Plotzy | Full Stack Book Writing and Publishing Platform

**Founder and Sole Full Stack Developer** · plotzy.co · github.com/faresadel07/plotzy1

Production SaaS platform that takes writers from a blank page to a published book, featuring a distraction free writing studio, AI assisted drafting, self hosted audiobook studio, AI cover designer, community library, publishing marketplace, story bible, public domain reader, writing course with verified certificates, and a full admin panel. Designed, built, and deployed end to end as the sole developer.

**Architecture and Delivery**

- Architected and shipped a production web platform end to end: React + TypeScript single page frontend, Node.js + Express + TypeScript REST API, and PostgreSQL database, deployed on Vercel (frontend), Railway via Docker (backend), and Supabase (managed Postgres, migrated mid project from Neon).
- Delivered 43 distinct pages, 150+ reusable components, and 257 REST API endpoints covering writing editor, chapter manager, story bible, AI assistant, audiobook studio, cover designer, publishing marketplace, find a publisher, community library, public domain library, social graph, donation flow, support system, and admin dashboard.
- Modeled a relational schema of 30+ Postgres tables with foreign keys, cascade deletes, composite indexes for hot queries, and unique indexes for idempotency on payment captures and AI usage records.

**Frontend Engineering**

- Built a responsive, accessible UI with React 18, TypeScript, Tailwind CSS, and Radix UI primitives (accordion, alert dialog, dropdown, popover, select, tooltip, dialog, avatar, checkbox, and more), with motion design via Framer Motion and GSAP, plus 3D scenes via Three.js (interactive book viewer on the landing page).
- Implemented full internationalization with first class Arabic (right to left) and English coverage across the entire application, including the editor, the PDF export typography (Cairo and Amiri fonts), the AI prompts, every legal and FAQ page, and the educational course content. Supports 8 UI languages total.
- Engineered the client data layer with TanStack React Query for caching, mutations, and optimistic updates, paired with React Hook Form and Zod for typesafe form handling and validation.
- Developed a rich text writing experience on TipTap (ProseMirror) with autosave, drag to reorder chapters, story bible auto extraction, version history, and a built from scratch DOM measurement based pagination engine for the print preview.
- Shipped as an installable PWA with Workbox service worker, offline fallback, custom navigateFallbackDenylist for OAuth callback safety, and dynamic SEO meta tags, JSON LD structured data (BreadcrumbList, Article), Open Graph, robots.txt, and sitemap.xml.
- Integrated Sentry for production error monitoring and built a centralized AI error helper that unpacks OpenAI SDK error shapes and surfaces real provider messages to admin users in the UI.

**Backend and Data**

- Designed a typed Express + TypeScript API with session based authentication (Postgres backed via connect-pg-simple) and runtime environment validation (Zod) that fails fast on misconfiguration.
- Modeled and queried PostgreSQL with Drizzle ORM, including schema migrations, manual SQL migration scripts for managed Postgres TTY constraints, and ON CONFLICT DO NOTHING idempotency on every revenue and AI usage table.
- Implemented multi provider authentication via Passport.js: email and password with bcrypt hashing and email verification, plus Google OAuth and Apple Sign In, with secure password reset and email change flows.
- Built three layer rate limiting (general API, AI specific, payment specific) with express-rate-limit, and a custom tierAiLimiter middleware that enforces per user daily AI quotas based on subscription state.

**AI Integration and Audio Engineering**

- Integrated 10+ distinct AI features (writing polish, expand, continue, translate, story plotting helper, story bible auto extract, blurb writer, cover prompt expansion, marketplace analyses, find a publisher proposal generator) via the OpenAI SDK pointed at Groq running Llama 3.3 70B Versatile for fast and cheap inference.
- Self hosted Piper TTS in the Docker container with five voice models (Ryan, Sophie, Jenny, James in English, Kareem in Arabic) downloaded at image build time, achieving unlimited audiobook narration with zero per minute cost.
- Engineered the audiobook pipeline: long text chunker splitting at sentence boundaries near 6,000 chars, parallel Piper WAV synthesis per chunk, ffmpeg WAV to MP3 encoding, and ffmpeg concat demuxer for multi chapter assembly (replacing Buffer.concat which produced unplayable MP3s in strict players).
- Built signal aware error reporting that distinguishes SIGKILL (cgroup OOM kill) from SIGSEGV (native crash) and surfaces the real cause to operators without requiring log access.

**Payments, Email, and Security**

- Integrated PayPal Smart Buttons with the Radio Fields pattern for the donation flow, with create-order and capture-order against the PayPal Orders API, idempotent captures, amount and currency post capture verification, Sentry forensic logging on mismatch, and a separate donations table with full admin reporting.
- Built a complete transactional email system with Resend covering welcome, payment receipts, security alerts, engagement notifications, subscription cancellation, and expiry reminders, with HTML escaping, email header injection protection, and bilingual templates.
- Applied security best practices: input sanitization, authentication gating on every owner only endpoint, SQL injection protection via Drizzle parameterized queries, session cookies with HttpOnly / Secure / SameSite flags, OAuth state verification, and forensic logging on payment tampering attempts.
- Generated server side PDFs via Puppeteer with Chromium for book exports (Cairo and Amiri Arabic fonts), Word docx exports via the docx library, EPUB exports via epub-gen, plus a verifiable course certificate PDF with unique verification codes.

**Product and Content**

- Built a structured learning academy with 6 modules, 27 lessons, 6 quizzes, a final project, and verifiable PDF certificates, with course content bundled in source code so it survives database migrations.
- Built a writing guide covering 15 genres, 3 story structure frameworks (Hero's Journey, Save the Cat, Three Act), the six character pillars and three classic arc types, dialogue principles with worked Arabic and English examples, a self editing checklist, and full PDF download.
- Integrated Project Gutenberg (70,000+ English classics) and the Hindawi Foundation (tens of thousands of Arabic classics) as a built in public domain reader, with PDF.js for in browser reading and resume-from-page progress tracking.
- Built a full admin panel with Recharts powered analytics (revenue, donations, conversion rate, churn, MRR), user management, support ticket inbox, content moderation, activity feed, and AI usage tracking.

**Tech Stack**

React 18, TypeScript, Vite, Tailwind CSS, Radix UI, TanStack React Query, React Hook Form, Zod, Framer Motion, GSAP, Three.js, TipTap, Wouter, PDF.js, Workbox PWA, Recharts, Node.js, Express, PostgreSQL, Drizzle ORM, Supabase, Passport.js, bcryptjs, connect-pg-simple, Multer, OpenAI SDK (against Groq), Piper TTS via Python child process, ffmpeg, Puppeteer + Chromium, docx, epub-gen, PayPal Smart Buttons SDK, Resend, Sentry, Docker, Vercel, Railway, pnpm workspaces, OAuth (Google, Apple), i18next, Arabic RTL.

---

## PROFESSIONAL EXPERIENCE

### Broadway Auto Parts | Operations Specialist (QA, Dispatch, Sales)
**Full Time** · United States · Jan 2026 to Present

- Monitor and review vehicle quality standards prior to purchase and dispatch, ensuring full compliance with internal benchmarks; conduct systematic inspection and testing to identify defects before customer delivery.
- Coordinate vehicle collection and delivery schedules between Chicago based clients and internal operational teams; manage dispatch operations, route planning, and optimization to maximize on time performance.
- Negotiate high ticket vehicle purchases with clients based in Chicago, assessing specifications and condition reports to secure favorable terms while balancing client expectations with company margins and inventory strategy.

### Detroit Axle | Customer Service Representative
**Full Time** · Jordan · Aug 2025 to Oct 2025

- Assisted customers in identifying and purchasing the correct automotive parts based on detailed vehicle specifications.
- Resolved compatibility issues and provided expert guidance on parts identification across diverse vehicle models.

### Uncle Osaka | Operations Assistant
**Full Time** · Jordan · Jun 2025 to Aug 2025

- Managed order taking, packaging, and customer service in a high paced dessert shop, ensuring professionalism and operational efficiency.
- Prepared a variety of desserts and served as barista for high quality hot beverages while handling cash transactions and staff coordination.

### Self Employed | Cryptocurrency Markets Specialist
**Freelance** · Mar 2022 to Sep 2025

- Managed digital asset portfolios for private clients with disciplined risk assessment and strategic recommendations based on shifting market conditions.
- Executed peer to peer cryptocurrency exchanges as a trusted intermediary, building reputation through clear client communication and secure transaction handling.
- Applied technical analysis and price action methodologies to identify high probability trading opportunities; participated in early stage crypto project evaluations before public exchange listings.

---

## EDUCATION

### Bachelor of Business Information Technology
**The Hashemite University, Jordan** · 2022 to 2026

Curriculum combining computing and business principles to develop technology driven solutions. Includes 1.5 years of relevant background in Mathematics prior to major transfer.

---

## CORE SKILLS AND EXPERTISE

**Full Stack Development:** React 18, TypeScript, Node.js, Express, PostgreSQL, REST API design, monorepo architecture (pnpm workspaces), end to end typesafety with shared Zod schemas

**AI and Machine Learning:** OpenAI SDK, Groq integration (Llama 3.3 70B), prompt engineering for bilingual systems, self hosted TTS with Piper, AI error handling and observability, daily quota enforcement, two attempt fallback strategies

**Frontend Engineering:** Tailwind CSS, Radix UI, Framer Motion, GSAP, Three.js, TipTap (ProseMirror), TanStack React Query, React Hook Form, Wouter routing, Workbox PWA, PDF.js, Recharts, custom design systems, custom pagination engines, custom modal and toast systems

**Backend and DevOps:** Docker, multi stage Dockerfiles, Vercel, Railway, Supabase, Drizzle ORM, schema migrations, Postgres index strategy, session storage with connect-pg-simple, Puppeteer for PDF generation, ffmpeg for audio pipelines

**Payments and Auth:** PayPal Smart Buttons SDK, PayPal Orders API, idempotent payment captures, amount and currency verification, OAuth (Google, Apple), Passport.js, bcrypt password hashing, email verification flows, secure password reset

**Security:** Input sanitization, authentication gating, three layer rate limiting (general, AI, payments), SQL injection protection via parameterized queries, session cookies with HttpOnly / Secure / SameSite, OAuth state verification, forensic logging on payment tampering

**File Processing:** PDF generation (Puppeteer + Chromium with Cairo and Amiri Arabic fonts), Word docx export, EPUB export, image processing, bilingual typography, base64 to file system migrations

**Internationalization:** Bilingual Arabic right to left and English implementation across the entire stack, 8 UI languages total, language auto detection from user content, AI prompts that reply in the writer's language, Arabic font handling in PDF export

**Email Systems:** Resend SDK, bilingual HTML templates, fire and forget dispatch, idempotent sending, HTML escaping, header injection protection, transactional flows for receipts, welcome, cancellation, and engagement

**Cryptocurrency and Trading:** Technical analysis, portfolio management, peer to peer trading, early stage project evaluation, risk assessment

**Business and Sales:** Negotiation, lead generation, consultative selling, high ticket deal closing, CRM, client communication, cross cultural operations

**Soft Skills:** Multitasking, attention to detail, cross cultural communications, solo execution from idea to production, technical writing and case studies, customer support

---

## KEY CERTIFICATIONS

**Artificial Intelligence**

- Anthropic AI Fluency (11 certifications: Framework and Foundations, Claude Code in Action, Claude with the Anthropic API, Claude with Google Vertex AI, Claude with Amazon Bedrock, Model Context Protocol Advanced, Introduction to Agent Skills, Introduction to Subagents, Claude 101 and Cowork, AI Fluency for Educators and Students, AI Capabilities and Limitations, Teaching the AI Fluency Framework)
- AI Fundamentals | Cisco
- Artificial Intelligence Fundamentals | IBM
- HCCDA AI Course | Huawei
- Gemini Certified Educator and Faculty | Google
- Gemini Certified University Student | Google
- Google Certified Educator Level 2 | Google
- AI and Career Empowerment | University of Maryland
- ChatGPT for Everyone | OpenAI
- Advanced Prompt Hacking | Learn Prompting
- AI PR Toolkit Crash | Semrush

**Software Development and Marketing**

- JavaScript Essentials 2 | Cisco Networking Academy
- Programming Fundamentals and AI | Crown Prince Foundation
- Apple Certified (Apple Ads) | Apple
- Social Media Marketing | HP

**Business, Real Estate, and Finance**

- Keller Williams Real Estate Agent | Keller Williams Realty
- Manage a Real Estate Business | Keller Williams VIP
- Clients for Life with Buyers and Sellers | Keller Williams
- Sales Fundamentals | Keller Williams
- The Principles of Real Estate | Keller Williams Realty

**Academic and Specialized**

- Introduction to Logic | Stanford Online
- Forensic Science: DNA Analysis | University of Cambridge

---

## LANGUAGES

**Arabic** Native · **English** Professional Working Proficiency
