# Competitive Research and Free API Opportunities for Plotzy

Compiled 2026-06-19 from a comprehensive sweep of the AI writing
platform space and the free developer-tools ecosystem.

Three parts:

1. **What competitors do well that Plotzy does not have yet** (a
   deliberately short list, not a "copy everything" wish list).
2. **Free APIs that can power new Plotzy features at zero cost** (the
   most actionable section, given the budget reality).
3. **A prioritised feature recommendation list** with rough effort
   estimates so we can pick the next 3-5 weekends of work.

---

## Part 1 — Competitor analysis

### The direct rivals (AI writing platforms)

#### Sudowrite (the category leader)

Their differentiators:
- **"Describe"** tool: highlight a noun, click Describe, get 5 vivid
  sensory descriptions to drop in.
- **"Show not tell"**: highlight a paragraph, click, get a rewrite
  that uses concrete details and dialogue instead of telling.
- **"Story Engine"**: outline-aware AI that writes the whole next
  chapter following the writer's pre-typed beats.
- **"Story Bible"**: similar to Plotzy's lore entries but with auto-
  extracted character voices that the AI uses verbatim.

**What Plotzy already has**: a lore system (loreEntries) and a chapter
editor. The Studio is more powerful than Sudowrite's chat mode because
of multi-model.

**Gap**: Plotzy has no quick-action AI on selected text. Highlighting a
word and getting Describe / Show-not-tell / Polish in one click is a
killer flow Sudowrite users love. **Worth adding**.

#### NovelCrafter (the worldbuilders' tool)

Their differentiators:
- **"The Codex"** is their crown jewel: a structured database for
  characters, locations, factions, magic systems, with type-safe
  fields. Like Notion for fiction, but specialised.
- **Bring-your-own-API-key model**: writers pay OpenAI directly, no
  Plotzy-style donation needed.

**What Plotzy already has**: lore entries (characters / locations /
items / magic / other).

**Gap**: Plotzy's lore is plain text. NovelCrafter's Codex has
typed fields (a character has age, hair colour, voice samples;
a location has climate, government, language). **Worth adding** when
we redesign the lore system, but not urgent.

#### Plottr (the plotter's tool)

Their differentiators:
- **Timeline view**: every scene is a card on a horizontal timeline.
- **Genre templates**: pick "Mystery" or "Hero's Journey" and get the
  beats pre-populated.

**What Plotzy already has**: a chapter list with order, the writing
guide covers 3 story structure frameworks already.

**Gap**: no visual timeline. No "pick a template, get pre-populated
scenes" flow. **Worth adding** as a small Phase 2 feature.

#### Campfire and World Anvil (the worldbuilders)

Their differentiators:
- **Relationship webs**: who-loves-who-hates-who visual graphs.
- **Family trees**: drag-and-drop genealogy.
- **Interactive maps**: upload a world map, pin locations to lore.
- **Made-up language dictionaries**: for fantasy writers, define
  words in their invented language with translations.
- **Article templates**: 100+ wiki-style fields per article type.

**What Plotzy already has**: lore entries with plain text.

**Gap**: all of the above are visual / structured features that
Plotzy doesn't touch. **Worth adding** in a "Worldbuilding tab"
later, but heavy work.

### What competitors do that Plotzy should NOT copy

- **Monthly subscriptions** ($10-30/mo). Plotzy is free, that is the
  brand promise.
- **Modular pricing** (pay $4 for the magic-system module, $4 for
  maps...). Customers find this annoying.
- **Closed AI** (you don't see what model you're talking to). The
  Studio's multi-model is a real differentiator the others lack.
- **Heavy lock-in** (proprietary file formats). Plotzy's open exports
  (PDF, EPUB, Word, TXT) are better.

---

## Part 2 — Free APIs we can use right now

This is the high-impact section. Every API below has a free tier we
can use forever, no credit card.

### Free LLMs (Studio expansion)

| Provider | Free quota | Models | Notes |
|---|---|---|---|
| **Cerebras** | **1M tokens/day** | Llama 3.3 70B, Llama 4 Scout | Fastest free inference on the market. Could replace or supplement Groq inside the Studio. |
| **Groq** | 6K tok/min, 1K req/day | Llama 3.3 70B, GPT-OSS | We already use Groq for Llama. |
| **Google AI Studio** | 50 req/day Gemini 2.5 Pro | Gemini 2.5 Pro, Flash | This is what we pointed at for "Gemini" in the Studio. |
| **OpenRouter** | $1 of free credits | 50+ models including frontier | Useful as a fallback router. |
| **GitHub Models** | 50 req/day per model | GPT-4o, Claude, Llama, more | Through a GitHub access token. Real free Claude access. |
| **Cloudflare Workers AI** | 10K neurons/day | Llama, Mistral, more | Edge-distributed, low latency. |
| **NVIDIA NIM** | Free tier | Various open models | API-compatible with OpenAI SDK. |
| **Mistral** | 1 req/sec | Mistral Large, Codestral | Direct API, simple integration. |
| **Z AI (GLM)** | Free | GLM 4.5 | Less well-known but capable. |

**Actionable**: Add **Cerebras** as a fifth Studio provider. 1M
tokens/day is more than any single writer will ever use. We could
make Cerebras the new default and free Groq for the AI marketplace's
analysis calls.

### Free dictionary, thesaurus, and rhyme APIs (huge for writers)

| API | What it does | Limit |
|---|---|---|
| **Free Dictionary API** | Definitions, etymology, synonyms, audio pronunciation | No key needed, unlimited |
| **Datamuse** | "Words that mean X", "rhymes with X", "sounds like X" | 100K queries/day no key |
| **Merriam-Webster API** | Full dictionary + thesaurus | 1000 queries/day with free key (non-commercial) |
| **Wordnik** | Dictionary + word-of-the-day | Generous free tier |

**Actionable**: Build a **dictionary lookup directly inside the
editor**. Writer highlights a word, presses Cmd+D, sees definition +
synonyms + rhymes in a tooltip. Datamuse + Free Dictionary together
cost zero and unlock the kind of "in-flow lookup" Scrivener charges
$50 lifetime for.

### Free text-to-speech (Audiobook Studio expansion)

Right now Plotzy uses Piper TTS self-hosted. Five voices, including
Arabic Kareem. Working.

What's available as a backup or upgrade:

| Provider | Free quota | Voices | Notes |
|---|---|---|---|
| **Microsoft Edge TTS** | **Unlimited (unofficial)** | 400+ voices, 140+ languages | Used via `edge-tts` Python lib or the OpenAI-compatible wrapper. **Way more voices than Piper, including premium Arabic dialects.** |
| **Smallest.ai Lightning** | 30 min/month free | English-only | Sub-100ms latency, useful for live read-along. |
| **HuggingFace TTS** | Free via Inference Providers | Various open models | Slower but free. |

**Actionable**: Add **Edge TTS as the premium audiobook track** while
keeping Piper as the always-on fallback. Edge TTS has natural
Arabic voices (Saudi, Egyptian, Levantine dialects) that Piper does
not. Self-hosted edge-tts wrapper exists.

### Free image generation (Cover Designer expansion)

| API | Free quota | Notes |
|---|---|---|
| **Pollinations AI** | **Unlimited, no key needed** | Powered by Flux. URL-based: `pollinations.ai/p/{prompt}` returns a 1024x1024 image. |
| **Cloudflare Workers AI** | 10K neurons/day | Stable Diffusion XL, Flux Schnell. |
| **HuggingFace Inference** | Generous free | All open models. |
| **Google AI Studio** | Free Gemini image gen | Gemini can output images now too. |

**Actionable**: Right now Plotzy's cover generator goes through paid
DALL-E. We could swap in **Pollinations** as the free default
(unlimited, no quota) and keep the paid one as opt-in for premium
results.

### Free book metadata APIs (Marketplace + Find a Publisher)

| API | What it gives you | Notes |
|---|---|---|
| **Open Library API** | Title, author, ISBN, cover, description for 25M+ books | Free, no key, by Internet Archive |
| **Google Books API** | Same but with stronger metadata | 1000 req/day no key, more with key |
| **ISBNdb** | ISBN lookup, publisher data | $15/mo for paid, has a limited free tier |

**Actionable**: For the "Find comparable titles" step in **Find a
Publisher**, search Open Library for books with similar genre + word
count and present them to the writer as "books like yours". Zero
cost.

### Free translation APIs

| Provider | Quota | Languages |
|---|---|---|
| **LibreTranslate** | Self-hostable, unlimited | 30+ |
| **MyMemory** | 5000 words/day free | 70+ |
| **DeepL Free** | 500K chars/month | 30+ (highest quality) |
| **Lingva Translate** | Free Google Translate proxy | 100+ |

**Actionable**: Plotzy's bilingual AI already translates in-flight,
but a **batch translation tool** ("translate this whole chapter to
French") would be useful for writers exploring international markets.

### Other free APIs worth knowing about

- **Unsplash Source**: free stock photos by keyword, no key. Useful
  for cover designer backgrounds.
- **Iconify**: 200K+ free SVG icons. Useful inside the editor for
  story beat markers.
- **Wikipedia API**: 100% free, useful for the AI assistant when a
  writer asks "what did the Romans wear?"
- **Open Trivia DB**: free, could power a "writing trivia" page.

---

## Part 3 — Recommended features for Plotzy, prioritised

Each idea is scored on **impact** (will writers love it?) and **effort**
(weeks for me to ship).

### Quick wins (high impact, low effort, free)

#### 1. Inline dictionary lookup in the editor — **2 days**
Writer highlights any word, presses Cmd+D, gets a popover with
definition + synonyms + rhymes. Powered by Free Dictionary API +
Datamuse (both unlimited, no key).
*Inspired by*: Scrivener's built-in dictionary.
*Differentiator*: Plotzy's version is bilingual (Arabic dictionaries
via Datamuse's Arabic mode + an Arabic-only Wikipedia query path).

#### 2. Add Cerebras as 5th Studio provider — **1 day**
1M tokens/day free is more than every single writer combined would
use. Cerebras serves Llama 3.3 at lightning speed. We add one
provider to `providers.ts` and one chip to the UI.
*Outcome*: Writers get unlimited free Llama on the Studio with much
better latency.

#### 3. Quick AI actions on highlighted text — **3 days**
The Sudowrite flow: highlight, right-click, pick "Polish", "Describe",
"Show not tell", "Continue". One click instead of opening the Studio
and typing.
*Inspired by*: Sudowrite (their #1 differentiator).
*Implementation*: TipTap menu extension + 4 prompt templates routed
through the existing Studio backend. No new endpoints.

#### 4. Read-aloud while writing — **2 days**
A small "read" button in the editor toolbar that streams Edge TTS for
the current paragraph as the writer types. Catches awkward phrasing
and is also a beautiful accessibility feature.
*Cost*: $0, Edge TTS is free.

#### 5. Visual writing streak + daily prompt — **2 days**
A small calendar dot grid on the home page showing the last 30 days
of writing. Plus an AI-generated personalized daily prompt
("Tariq just stepped through the door. What's on the other side?").
*Inspired by*: Duolingo, the Notion daily-prompt experience.
*Cost*: $0, Llama on Cerebras for the daily prompt.

### Medium-effort features (1-2 weeks each)

#### 6. Story Timeline view — **1 week**
A horizontal scrollable timeline of chapters with drag-to-reorder.
Each scene is a card with the first line of text. Toggle alongside
the current vertical chapter list.
*Inspired by*: Plottr (the timeline is their entire selling point).

#### 7. Genre template starter — **5 days**
"New Book" flow asks "what kind of story?" → "Hero's Journey",
"Save the Cat", "Three Act", or one of 8 genre-specific templates.
Pre-populates chapters with placeholder titles ("Act 1, Scene 1: The
ordinary world"). Writers fill in the rest.
*Inspired by*: Plottr.

#### 8. Relationship web (Story Bible visual) — **1 week**
React Flow graph showing character relationships. Drag a character
to another, label the line ("loves", "betrayed", "father of").
Already have the lore data; just need a visualization layer.
*Inspired by*: Campfire (their #1 worldbuilder feature).

#### 9. Find a publisher v2: comparable titles — **3 days**
When the AI generates a submission proposal, it also pulls 3-5
similar books from Open Library matching the genre + word count
and shows them as "Comp titles a publisher will recognise."
*Cost*: $0, Open Library API.

#### 10. Story doctor — **1 week**
The Studio gains a new action: "Analyse my whole book". The model
reads chapter by chapter (with summaries to fit context) and returns
a report on plot holes, character arc consistency, pacing dips, and
unresolved threads.
*Implementation*: A new Studio endpoint that orchestrates several
Cerebras calls in sequence. Total cost per analysis: $0.

### Larger features (2+ weeks each)

#### 11. Worldbuilding tab on the book page — **3 weeks**
A whole new tab next to Chapters / Book Pages / Research / Analytics /
Tools. Hosts:
- Structured Codex-style character cards
- Family tree drag-drop
- Made-up language dictionary
- World map upload with pinned locations

#### 12. Beta reader marketplace — **2 weeks**
A new section in the community: writers post "looking for beta
readers" with genre + word count + deadline. Other writers can claim
the read, get notified, leave comments. Builds writer-to-writer
trust.

#### 13. Voice journaling and dictation — **1 week**
Press and hold a microphone, speak your idea, get a Whisper-style
transcription dropped into the chapter or a new note. Useful for
bed-time idea capture.
*Cost*: Whisper is in Groq's free tier (whisper-large-v3 free).

#### 14. NaNoWriMo / writing sprint mode — **5 days**
A 25-minute focus timer with stats. At the end, a celebratory
animation and a writing-streak point. Build a community leaderboard
for opt-in users.

#### 15. Pinterest-style mood board per book — **1 week**
Each book gets a visual mood board. Drag images in (Unsplash Source
API or upload). The AI assistant reads the mood board when generating
covers, blurbs, and the Studio system prompt.

---

## Recommended next 30 days

If I were prioritising my own time to maximise writer delight per hour
of work:

**Week 1**: Items 1, 2, 3 (inline dictionary, Cerebras, quick AI
actions). Three days of work, three features that materially upgrade
the writing experience.

**Week 2**: Items 4, 5 (read-aloud, writing streak + daily prompt).
Mostly UI work, pulls together what is already there.

**Week 3**: Items 6, 9 (timeline view, comp titles in find-a-
publisher). Visual feature plus a free API integration.

**Week 4**: Pick from items 8, 10, 13 based on what you find most
interesting after seeing weeks 1-3 land.

That's a month of work that ships **9 distinct new features**, all
running on free APIs.

---

## Sources

Research compiled on 2026-06-19. Key references:

- [Best AI Writing Tools 2026 (Sudowrite, NovelCrafter, more)](https://blog.mylifenote.ai/the-11-best-ai-tools-for-writing-fiction-in-2026/)
- [Sudowrite vs NovelCrafter](https://ilampadmanabhan.medium.com/sudowrite-vs-novelcrafter-bdc3f33ba95f)
- [Plottr vs Campfire Write 2026](https://writeabookai.com/blog/plottr-vs-campfire-book-planning-worldbuilding-2026)
- [Best Worldbuilding Tools 2026 (World Anvil and alternatives)](https://storyflow.so/blog/best-tools-worldbuilding-2026)
- [15 Free LLM APIs 2026](https://www.analyticsvidhya.com/blog/2026/01/top-free-llm-apis/)
- [Best Free LLM API Tiers 2026 (Groq, Cerebras, GitHub Models)](https://wetheflywheel.com/en/ai-model-access/free-llm-api-tiers-2026/)
- [Awesome Free LLM APIs GitHub list](https://github.com/amardeeplakshkar/awesome-free-llm-apis)
- [Datamuse API](https://www.datamuse.com/api/)
- [Free Dictionary API](https://publicapi.dev/free-dictionary-api)
- [Microsoft Edge TTS wrapper](https://github.com/travisvn/openai-edge-tts)
- [Best Open Source TTS Models 2026](https://www.bentoml.com/blog/exploring-the-world-of-open-source-text-to-speech-models)

---

**What I need from you to start work:**

1. Look at the prioritised list, pick the top 3 you most want next.
2. Or just say "do week 1" and I will ship inline dictionary, Cerebras,
   and quick AI actions in 3 days.
