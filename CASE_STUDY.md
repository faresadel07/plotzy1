# Plotzy, a case study

The longer story behind the project in [`README.md`](./README.md). What
was hard, what worked, what broke, and what I would do differently next
time. Written for engineers and hiring managers who want to know how I
think under pressure.

---

## The problem

Arabic writers are underserved by every existing writing platform. The
two best known SaaS tools for novelists (Scrivener and Sudowrite) treat
Arabic as a paste-in afterthought. Their editors break on right to left
text, their PDF exports use the wrong font fallbacks, their AI features
prompt in English and reply in English, and their subscription pricing
puts the whole product behind a paywall that most writers in the region
cannot justify.

Plotzy is the response: every feature, from the editor to the audiobook
to the cover designer, designed bilingually from the first commit, free
for every writer, with the same level of polish in Arabic as in English.

---

## The constraints

I built this alone, as the final year graduation project at the
Hashemite University in Jordan, while taking a full course load. The
constraints shaped every technical decision:

- **One developer.** No room for architecture astronautics. Everything
  picks the simplest tool that does the job.
- **Zero budget.** Free tiers everywhere. Migrating off any paid service
  the moment it gets expensive.
- **Production from day one.** This is not a class assignment that lives
  on localhost. Plotzy has run in production for months with real users.
- **No team to consult.** Every architectural call is mine. Every bug at
  3 AM is mine to fix.

---

## The stack and why

### Why React + Vite, not Next.js

Plotzy does not benefit from server side rendering. Every page is
gated behind a login, the SEO-relevant pages (landing, about, donate,
privacy, terms) are static and could be prerendered if needed, and the
PWA story is simpler with a single bundler. Vite gave me hot reload in
under 200 ms across 73,000 lines of code, which mattered when the
inner feedback loop was a daily pain.

### Why Express + Drizzle, not tRPC or GraphQL

REST endpoints map cleanly onto the workflow I was building. The
frontend uses TanStack Query against typed `fetch` helpers, and Drizzle
gives me end to end types through a Zod layer in `lib/api-zod`. The
result is the typesafety promise of tRPC without committing the
backend to a particular RPC shape, which matters if Plotzy ever needs
a public API.

### Why PostgreSQL on Supabase, not Mongo or SQLite

A writing platform has rich relational data (users, books, chapters,
likes, follows, comments, transactions, AI usage logs, course
progress, certificate records, support tickets). Postgres handles
this elegantly and Supabase gives me a managed instance with
generous free tier limits and PITR backups. The schema lives in
`lib/db/src/schema/index.ts` as the single source of truth.

### Why Groq, not direct OpenAI

The `openai` SDK is a thin HTTP client. Point its `baseURL` at
`api.groq.com` and you get Llama 3.3 70B at 10% of the OpenAI price
with 3x the throughput. The marketplace, AI assistant, blurb writer,
proposal generator, and cover prompt expander all run on Groq.
Switching providers took twenty minutes total when costs climbed.

### Why Piper TTS, not ElevenLabs or OpenAI TTS

ElevenLabs charges per character. OpenAI TTS charges per character.
Both would have killed the project's economics the moment a writer
narrated a 50,000 word novel. Piper TTS runs locally in the Docker
container, the voice models are 60 to 100 MB each and downloaded at
image build time, and the cost per minute of narration is the
electricity to run the container. Five voices ship today (Ryan,
Sophie, Jenny, James in English, Kareem in Arabic). New ones plug in
with a single entry in `PIPER_VOICES`.

---

## The hard parts

### Arabic right to left in a rich text editor

TipTap and ProseMirror are direction agnostic but the wider browser
ecosystem is not. The pagination engine in the chapter editor had to
re-derive page breaks when the writer switched languages mid book
(headers and footers move to the other side, page numbers mirror,
column reading order inverts). I wrote the layout engine from
scratch in `PrintPreview.tsx` with a DOM measurement based paginator
that holds a hidden host div, lays out a candidate page there,
measures `scrollHeight`, and binary searches for the break point.
The PDF export uses Puppeteer with the same CSS rules so the
on-screen and on-paper layouts match exactly.

### The audiobook export pipeline

A 50,000 word book is 60 to 90 minutes of audio. Single shot through
Piper crashes on memory at that length, and Node's `Buffer.concat`
on multiple WAV outputs produces a "frankenstein" file that strict
players (Windows Media Player, iOS Files) reject. The fix was a
chunker (`splitForTts` in `lib/piper-tts.ts`) that breaks the input
at sentence boundaries near 6,000 chars, synthesizes each chunk to
WAV, encodes each WAV to MP3 with ffmpeg, then concatenates the MP3s
using ffmpeg's `concat` demuxer rather than raw buffer concatenation.
The result is a clean, gapless audiobook MP3.

### The Neon to Supabase migration

Mid project, Neon's free tier hit a data transfer cap, knocking the
backend offline. The migration to Supabase took three hours and
exposed a quiet bug: `connect pg simple` was creating its own pool
from the raw connection URL with `sslmode=require` rather than
inheriting the main pool's SSL config, which broke session storage
on the new host. The fix is the one line `new PgSession({ pool,
tableName: "user_sessions", createTableIfMissing: false })` in
`app.ts`, but finding it took an evening of comparing `pg_stat_
activity` rows between the two providers.

### Surfacing real provider errors

Every AI route used to return a generic 500 with "Analysis failed"
or "Failed to generate audio preview", which made production debugging
impossible without Railway log access. I wrote `handleAiError` in
`lib/ai-error.ts` that unpacks the OpenAI SDK error shape (which
nests `error.message`, `error.type`, `error.code` differently
across providers), logs the structured form for ops, and surfaces
the real reason to admin users in the response so I can debug a
failure from the browser without leaving the page.

---

## The pivots

### Tiered SaaS to donation funded

The first version of Plotzy had three tiers (Free, Pro at $4.99 per
month, Premium at $8.99 per month). It launched, took two payments
in a week, and I realised the per-user economics of running the AI
assistant and audiobook generation were not going to work at that
price point, AND a paywall was the exact reason writers in the
region were not using the existing tools.

The pivot was four hours of work:

1. Rewrote the pricing page as a donation page with PayPal Smart
   Buttons (preset amounts plus custom field, no recurring
   subscription).
2. Bumped every free tier limit to match the old Premium tier in
   `lib/db/src/schema/index.ts` and flipped every `canUse*` capability
   to `true` in `lib/tier limits.ts`.
3. Updated user facing copy across the marketplace, the audiobook
   studio, and every gate to remove "Upgrade for more" language.
4. Built a donations table and an admin panel view so I can see who
   chipped in and how much, with proper idempotency on the PayPal
   capture flow.

The tier shape is still in the schema and the code so a future
operator can flip back to tiered pricing in minutes if the donation
model does not sustain the AI bills.

### Microsoft Edge TTS to Piper

The first audiobook engine was Microsoft Edge TTS via the unofficial
`edge tts` npm package. It worked beautifully until Microsoft started
rate limiting the unofficial clients. The migration to Piper TTS
required adding Python to the Docker image, downloading the voice
models at build time, reworking the audio pipeline around child
processes, and handling the fact that Piper outputs WAV not MP3. The
upside: no rate limits, no vendor risk, and Arabic voice support that
Edge TTS never had.

---

## What I would do differently

- **Start with the AI gateway abstraction earlier.** I built four
  AI features against the OpenAI SDK directly before extracting the
  shared `openai` instance and the `handleAiError` helper. The refactor
  was fine but the right shape was visible after feature one.

- **Treat sessions as a first class operational concern.** The
  Neon migration would have been a 30 minute job if I had not been
  surprised by `connect pg simple`'s SSL handling.

- **Build the admin panel earlier.** Plotzy did not have a "see all
  users / donations / errors" view until production traffic was
  already happening. I spent more time than I should have on the
  Supabase dashboard before building the proper internal tooling.

- **Stand up Sentry on day one.** Wiring it in late meant a few
  weeks of production traffic where errors were only visible if I
  happened to be tailing Railway logs.

---

## What this project says about my engineering

If you are evaluating Plotzy as a portfolio piece for a full stack or
AI engineering role, here is the short version of what I think it
demonstrates:

- I can take a product from zero to production, alone, end to end.
- I make technical decisions for business reasons, not for novelty.
- I refactor when the shape is wrong and ship when it is right.
- I write code other engineers can read. The schema file, the route
  handlers, and the AI gateway are all built to be edited by future
  me at 3 AM.
- I integrate AI services without confusing them for the product.
  The interesting work is the surface around the model, not the
  model call itself.
- I treat bilingual support as a first class concern, not a localisation
  layer.

If that is useful for a role you are hiring for, my contact
information is at the bottom of the [`README`](./README.md).
