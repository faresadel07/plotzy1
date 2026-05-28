# Cover Letters Kit — Faris Hamdan

Three battle-tested cover letter variants for different job types. Each is
short (under 220 words), highlights Plotzy as proof of capability, and
ends with a clear ask. Pick the variant by company type, change three or
four words to match the role, paste, send.

The three variants:

1. **AI Variant** — for jobs that mention LLMs, AI integration, GPT,
   Claude, OpenAI, RAG, agents, or "AI engineer".
2. **SaaS Startup Variant** — for jobs at startups under 200 people that
   want a generalist full-stack developer.
3. **Established Company Variant** — for jobs at companies of 200+ that
   list specific stack requirements and structured processes.

Personal data baked in:

- Name: Faris Hamdan
- Location: Zarqa, Jordan (open to remote and relocation)
- Tech: React + TypeScript + Node.js + PostgreSQL + AI integration
- Live demo: https://plotzy.co
- Repo: https://github.com/faresadel07/plotzy1
- LinkedIn: https://www.linkedin.com/in/fares-hamdan-428882305
- Email: faresadelqd@gmail.com

How to use each variant:

1. Open the file.
2. Copy the entire variant.
3. Replace `{COMPANY}` with the company name.
4. Replace `{ROLE}` with the exact role title in the job posting.
5. Replace `{HOOK}` with one sentence about why this specific company.
6. Send.

---

## Variant A — AI Variant

Use when the job mentions: AI, LLM, GPT, Claude, OpenAI, AI engineer,
agents, RAG, prompt engineering, AI integration, ML, machine learning.

```
Subject: Full-Stack Engineer with shipped AI product. Plotzy.co.

Hi {COMPANY} team,

I am applying for the {ROLE} position. I am a full-stack developer
who shipped a production AI product solo: Plotzy.co, a bilingual
Arabic and English writing platform that integrates ten distinct AI
features (writing assistant, audiobook narration, marketplace
analyses, cover prompts, manuscript proposal generator, and more)
on top of an OpenAI-compatible SDK pointed at Groq's Llama 3.3 70B
for cost.

What I built and why it is relevant to {COMPANY}: a centralised
handleAiError helper that unpacks provider error shapes (status,
code, type, message) and surfaces real reasons to admin users so
production debugging does not require log access. A two-attempt
fallback strategy for rate-limited prompts. Self-hosted Piper TTS
inside the Docker container so audiobook narration runs at zero
per-minute cost. Prompt engineering tuned for Arabic and English in
parallel.

The full repo is open source: https://github.com/faresadel07/plotzy1
(100K+ lines of TypeScript, 257 REST endpoints, 43 pages, 30+
tables). Live demo: https://plotzy.co.

{HOOK}

Available to start immediately. Open to remote work and relocation.

Faris Hamdan
faresadelqd@gmail.com
https://www.linkedin.com/in/fares-hamdan-428882305
```

---

## Variant B — SaaS Startup Variant

Use when the job is at a startup under 200 people and lists a generalist
full-stack role (React + Node + Postgres or similar).

```
Subject: Full-Stack Engineer who shipped a full SaaS solo. Plotzy.co.

Hi {COMPANY} team,

I am applying for the {ROLE} position. I built and shipped Plotzy.co
solo as my graduation project: a production SaaS writing platform
with chapter editor, AI assistant, audiobook studio, AI marketplace,
publishing flow, community library, admin panel, and a six-module
writing course with verifiable certificates. End to end. Schema,
backend, frontend, AI prompts, design, DevOps, docs.

What I think will matter to {COMPANY}: I made every technical
decision myself, including the ones I had to revisit later. I
migrated the database from Neon to Supabase mid-project to escape
a free-tier ceiling, swapped OpenAI direct for Groq to cut spend by
90%, replaced Edge TTS with self-hosted Piper, and pivoted the
entire pricing model from tiered SaaS to donation-funded without
rewriting the schema. I ship under real constraints.

Stack: React 18 + TypeScript + Tailwind + Radix UI on the frontend,
Express + Drizzle + PostgreSQL on the backend, Docker on Railway,
Vercel on the edge.

Live demo: https://plotzy.co
Open source: https://github.com/faresadel07/plotzy1

{HOOK}

Available immediately. Open to remote work and relocation.

Faris Hamdan
faresadelqd@gmail.com
https://www.linkedin.com/in/fares-hamdan-428882305
```

---

## Variant C — Established Company Variant

Use when the job is at a company of 200+ people with structured processes
and explicit stack requirements.

```
Subject: Full-Stack Application — {ROLE}.

Dear {COMPANY} Hiring Team,

I am writing to apply for the {ROLE} position. I am a final-year
Business Information Technology student at the Hashemite University
in Jordan, and the founder and sole engineer behind Plotzy.co, a
production bilingual writing SaaS now serving Arabic and English
writers globally.

The Plotzy build covers every layer of a modern web application and
maps directly to the responsibilities in your job posting:

- Frontend: React 18, TypeScript, Tailwind, Radix UI, TanStack
  React Query, React Hook Form, Zod, TipTap, Framer Motion, GSAP,
  Three.js, PWA via Workbox.
- Backend: Express + TypeScript, Drizzle ORM, PostgreSQL on
  Supabase, Passport.js (Google + Apple OAuth + email), bcrypt,
  connect-pg-simple sessions, three-layer rate limiting.
- AI and Audio: OpenAI SDK targeting Groq, ten distinct AI features,
  Piper TTS self-hosted in Docker for unlimited audiobook narration.
- Payments and Email: PayPal Smart Buttons with the Orders API and
  idempotent captures, Resend transactional email with bilingual
  templates.
- DevOps: Vercel for the frontend, Railway with a custom multi-
  stage Dockerfile for the backend, Supabase Postgres, pnpm
  workspaces monorepo.

Live demo: https://plotzy.co
Open source: https://github.com/faresadel07/plotzy1

{HOOK}

I am available to start immediately, open to working in your time
zone, and willing to relocate.

Thank you for considering my application.

Faris Hamdan
faresadelqd@gmail.com
https://www.linkedin.com/in/fares-hamdan-428882305
```

---

## The {HOOK} bank — one-liners to slot in

For the {HOOK} placeholder, pick one of these one-liners that fits the
company, OR write a fresh one. The goal is to prove you actually read
their site or job post, not to flatter them.

Generic hooks (safe defaults when you do not know the company):

- I am drawn to teams that ship fast and trust their engineers to own
  decisions end to end, and the role description suggests {COMPANY} is
  one of them.
- The {ROLE} responsibilities map closely to what I have already shipped
  alone on Plotzy, and I would like to do that kind of work as part of a
  team that already moves at speed.

Company-specific hook templates (replace the bracketed parts):

- I have been [using / following / reading the changelog of] {COMPANY}
  for [time period] and I appreciate that you [specific decision you
  noticed: shipped X, open-sourced Y, wrote about Z].
- I noticed {COMPANY} uses [specific tech they mentioned] in your stack;
  I have shipped that on Plotzy and would enjoy working on it inside a
  larger codebase.
- Your post mentions [specific responsibility]; I implemented exactly
  that on Plotzy in [specific subsystem]. Happy to walk through the
  decision tree on a call.

For AI companies specifically:

- I have read your [docs / blog post about X] and the way {COMPANY}
  thinks about [specific concept] mirrors how I built [related
  subsystem in Plotzy]. I would like to learn more by joining you.

For dev tool companies (Vercel, Supabase, Resend, etc.):

- I am already a user of {COMPANY} in production on Plotzy. Joining
  the team that ships the product I rely on every day would be the
  obvious next step.

---

## The follow-up message

If you do not hear back in 5 business days, send this short follow-up.
Keep it to four sentences max.

```
Hi {COMPANY} team,

Following up on my application for the {ROLE} role last week. I
remain interested and available immediately. If a different role
on the team might be a better fit, I am happy to pivot.

Live demo: https://plotzy.co
Open source: https://github.com/faresadel07/plotzy1

Faris Hamdan
```

---

## Three rules for the email itself

1. **Subject line.** The exact subject I wrote in each variant is
   already tuned. Do not change it unless the job posting requires a
   specific reference number, in which case prepend it: `Ref ABC-1234 |
   Full-Stack Engineer...`.

2. **Attachments.** Always attach the PDF at
   `docs/Faris_Hamdan_CV.pdf`. Never paste the CV into the body.

3. **One link in the body.** If the platform allows only one URL in
   the body, use https://plotzy.co. The GitHub link is in the CV
   anyway.

---

## House style for every cover letter you send from here on

- No em-dashes, no en-dashes, no emojis.
- Short paragraphs (no more than four lines each).
- Direct subject lines.
- Always close with availability and openness to relocation.
- Always mention Plotzy.co and the GitHub repo within the first three
  sentences.
