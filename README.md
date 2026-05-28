<div align="center">

# Plotzy

### A free writing platform for serious writers, in Arabic and English.

Chapter editor, AI assistant, audiobook narration, cover designer, marketplace,
public library, and a six module writing course, all in one place, no paywall.

[Live demo](https://plotzy.com) · [Case study](./CASE_STUDY.md) · [Tech stack](#technical-overview) · [Hire me](#about-the-builder)

![Plotzy home page](./docs/screenshots/home.png)

</div>

---

## What is inside

Plotzy is a full writing platform built from scratch by one developer. It started
as a graduation project at the Hashemite University in Jordan and grew into a
production system covering everything a writer needs to take a book from idea
to publication.

### Eight major surfaces

| Surface | What it does |
|---|---|
| **Chapter editor** | Rich text editor with autosave, drag to reorder, story bible for characters and worlds, version history, unlimited words. |
| **AI assistant** | Patient companion that helps with plotting, dialogue, revision, and rewriting in your language. |
| **Audiobook studio** | Turn finished chapters into a narrated MP3 in one click. Five AI voices, English and Arabic. |
| **Cover designer** | Generate a book cover with AI or compose your own from stock art and your title. |
| **AI marketplace** | Five professional analyses: developmental editing, copy editing, beta reader, cover generation, blurb writing. |
| **Find a publisher** | Reads your manuscript and drafts a tailored submission proposal you can send to publishers and literary agents. |
| **Community library** | Publish for the public, gather readers, follow other writers, like and rate books. |
| **Public domain shelf** | Tens of thousands of Arabic and English classics bundled in. Project Gutenberg plus the Hindawi Foundation library. |

Plus a six module writing course with twenty seven lessons, six quizzes, a final
project, and a verified certificate of completion. Plus a writing guide covering
fifteen genres and three story structure frameworks. Plus a fully bilingual UI
with proper Arabic typography and right to left reading by default.

---

## Screenshots

<table>
  <tr>
    <td width="50%">
      <strong>Your book page</strong><br/>
      <em>Five tabs, drag to reorder, multi format export, audiobook studio shortcut, find a publisher, publish to the community.</em><br/>
      <img src="./docs/screenshots/your-book.png" alt="Your book page" />
    </td>
    <td width="50%">
      <strong>AI marketplace</strong><br/>
      <em>Five professional analyses on your manuscript. Upload, paste, or pick from your own books.</em><br/>
      <img src="./docs/screenshots/marketplace.png" alt="AI marketplace" />
    </td>
  </tr>
  <tr>
    <td width="50%">
      <strong>Writing course</strong><br/>
      <em>Six modules, twenty seven lessons, quizzes, a verified certificate. Free.</em><br/>
      <img src="./docs/screenshots/course.png" alt="Writing course" />
    </td>
    <td width="50%">
      <strong>Community library</strong><br/>
      <em>Publish to the public library, follow writers, like and rate books, plus 70K+ public domain classics.</em><br/>
      <img src="./docs/screenshots/community.png" alt="Community library" />
    </td>
  </tr>
  <tr>
    <td width="50%">
      <strong>Writing guide</strong><br/>
      <em>Bilingual craft reference for fifteen genres, three structure frameworks, character pillars, and a self editing checklist.</em><br/>
      <img src="./docs/screenshots/guide.png" alt="Writing guide" />
    </td>
    <td width="50%">
      <strong>Support and FAQ</strong><br/>
      <em>Ticketed support with category and priority, plus eight category FAQ with deep links.</em><br/>
      <img src="./docs/screenshots/support.png" alt="Support and FAQ" />
    </td>
  </tr>
</table>

---

## By the numbers

<div align="center">

| | |
|---:|:---|
| **~100,000** | lines of TypeScript across frontend, backend, shared libs |
| **43** | distinct pages (writing, social, admin, learning, settings) |
| **150** | reusable React components |
| **257** | REST API endpoints |
| **8** | UI languages with full right to left support for Arabic and Hebrew |
| **5** | AI voices for audiobook narration in English and Arabic |
| **6** | course modules with quizzes and a verified certificate |
| **15** | story genres covered in the writing guide |
| **3** | story structure frameworks (Hero's Journey, Save the Cat, Three Act) |
| **1** | developer |

</div>

---

## Technical overview

### Frontend

- **React 18** with **TypeScript** for the entire UI
- **Vite** for the build and dev server
- **Tailwind CSS** for styling with custom design system
- **TipTap** (ProseMirror) as the rich text editor engine
- **Wouter** for routing (lightweight alternative to React Router)
- **TanStack Query** for server state and caching
- **Workbox** for the PWA service worker
- **react i18next** for internationalisation across 8 languages
- **PayPal Smart Buttons SDK** for donation processing
- **PDF.js** for in browser PDF reading of public domain books

### Backend

- **Express** with **TypeScript** for the API layer
- **Drizzle ORM** as the typesafe database layer
- **PostgreSQL** on **Supabase** (migrated from Neon mid project)
- **Passport.js** with Google OAuth and Apple OAuth flows
- **connect pg simple** for Postgres backed sessions
- **OpenAI SDK** pointed at **Groq** for fast and cheap LLM inference
- **Piper TTS** (self hosted, Python via child process) for audiobook synthesis
- **ffmpeg** for WAV to MP3 conversion and multi chapter audio concat
- **Puppeteer** + **Chromium** for PDF book exports
- **docx** for Word export, **epub gen** for EPUB export
- **Resend** for transactional email
- **Sentry** for error monitoring

### Infrastructure

- **Vercel** for the frontend (PWA on the edge)
- **Railway** with a custom Dockerfile for the backend (Express plus Python plus ffmpeg plus voice models)
- **Supabase** for Postgres
- **GitHub** for source

### Repository layout

Monorepo using **pnpm workspaces**:

```
plotzy/
├── artifacts/
│   ├── plotzy/          # React + Vite frontend
│   └── api-server/      # Express + Drizzle backend
├── lib/
│   ├── db/              # Drizzle schema, the single source of truth
│   ├── api-zod/         # Zod schemas shared between frontend and backend
│   └── shared/          # Utilities, types, constants used by both
└── scripts/             # One off migration and import scripts
```

The schema in `lib/db/src/schema/index.ts` is imported directly by the
backend and by the frontend's typed API client, so renaming a column
fails the type check across the whole repo before it can ship.

---

## Engineering highlights

A handful of decisions worth calling out from the build:

### Bilingual from the first line of code

Arabic right to left is not a translation layer over an English app. The
editor's pagination engine, the PDF export typography, the AI assistant's
prompts, the audiobook voice selection, the public domain library
(Hindawi for Arabic, Project Gutenberg for English), and every i18n
string are all aware of the writer's language at every level of the
stack. Arabic books export with the Cairo or Amiri font automatically.

### A monolithic AI gateway

Every AI feature (assistant, marketplace, blurb, cover, audiobook,
proposal) hits the same provider abstraction so swapping models is a one
line change. When the project migrated from OpenAI direct to Groq mid
flight to cut spend by 90%, the move took twenty minutes.

### Self hosted audiobook narration

The audiobook studio uses Piper TTS running locally in the container,
not a paid API. Each voice model is downloaded at image build time. The
result is unlimited narration with no per minute cost, in English and
Arabic equally.

### Real freemium with no paywall

Plotzy started as a tiered SaaS and pivoted to a donation funded model.
The user, capability, and limit tables are still in place so a future
operator can re enable tiers in minutes by flipping booleans in
`lib/db/src/schema/index.ts`.

### Production observability

Every AI route logs through a single `handleAiError` helper that
unpacks OpenAI SDK error shapes (status, code, type, provider message)
and surfaces the real reason to admin users in the UI, so debugging
production issues does not require Railway log access.

---

## Quick start (local dev)

```bash
pnpm install
cp .env.example .env       # fill in DATABASE_URL + AI keys
pnpm --filter @workspace/api-server dev     # backend on :8080
pnpm --filter @workspace/plotzy dev          # frontend on :5173
```

The frontend proxies `/api/*` to the backend, so a single browser tab on
`localhost:5173` is the full development experience.

Full deployment notes (Vercel + Railway + Supabase) are in
[`DEPLOYMENT.md`](./DEPLOYMENT.md).

---

## Read more

- [`CASE_STUDY.md`](./CASE_STUDY.md) for the deeper engineering story:
  challenges, decisions, and the things that broke.
- [`DEPLOYMENT.md`](./DEPLOYMENT.md) for the production setup.
- [`artifacts/plotzy/src/data/tutorial-guides.ts`](./artifacts/plotzy/src/data/tutorial-guides.ts)
  for a bilingual walkthrough of every section.

---

## About the builder

**Fares Q.** Final year Computer Science student at the Hashemite
University, Jordan. Built Plotzy alone as the graduation project, from
the database schema up to the production deployment.

Skill set proven by this repo:

- **Full stack:** React + TypeScript + Tailwind on the frontend,
  Express + Drizzle + PostgreSQL on the backend, end to end typesafe.
- **AI integration:** OpenAI compatible SDKs against multiple providers,
  Piper TTS self hosted, error surfacing patterns, prompt design for
  Arabic and English.
- **Internationalisation:** Right to left support down to the
  pagination engine and PDF export.
- **DevOps:** Vercel + Railway + Supabase wired up with Docker,
  GitHub Actions friendly.
- **Product:** Took the same codebase from a tiered SaaS pricing model
  to a donation funded model without a rewrite.

Available for remote full stack roles, contract work, or AI integration
projects.

- **LinkedIn:** [your link]
- **Email:** [your email]
- **GitHub:** [your github profile]

---

<div align="center">

If you write, Plotzy is for you. If you hire, I am for you.

</div>
