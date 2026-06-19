# The Studio
## A Premium Multi-Model AI Companion for Plotzy

> Replace the current "Writing Assistant" side panel with **The Studio**,
> a story-aware, multi-model AI companion that gives every writer direct
> access to Claude, GPT, Gemini, and others inside the chapter editor,
> with first-class design and zero generic-chatbot feel.

---

## ملخّص بالعربي

الـ Writing Assistant الحالي ضعيف بصرياً وعديم الشخصية: مجرد chat
panel تقليدي مع نموذج AI واحد مخفي، بدون أي إدراك للقصة أو الكتاب
أو الشخصيات. الكاتب بسأل سؤال عام ويحصل على إجابة عامة.

**الخطّة الجديدة**: نبنيه عبارة عن **مساعد كتابة فعلي يعرف قصتك**،
بأكثر من نموذج AI قوي تختار منهم (Claude، GPT، Gemini، Grok)، مع
تصميم يطابق روح Plotzy: أسود ناعم + بنفسجي مع تفاصيل سينمائيّة.

كل نموذج له شخصية معروضة:
- **Claude** للحوار العميق وتطوير الشخصيات
- **GPT-5** للحبكات المعقّدة والأفكار الجريئة
- **Gemini** للبحث والمعرفة العامة
- **Grok** للمزاج المختلف والحوار الصريح

الكاتب يقدر:
1. يختار النموذج الذي يريد
2. يقارن بين نموذجين ويأخذ الأحسن
3. يضع المساعد سياق الفصل + الموسوعة + الشخصية الحالية تلقائياً
4. ينقر نقرة واحدة ويُدرج رد الـ AI داخل الفصل
5. يحفظ المحادثات لكل فصل بشكل دائم

النتيجة: ميزة مميّزة عن أي منصّة كتابة ثانية بالعالم.

---

## Part 1, The Vision

### What's wrong with the current Writing Assistant

The current panel does three things badly:

1. **Generic chatbot UX.** It looks and feels like a third-tier
   ChatGPT clone bolted onto the editor. The opener "How can I help
   today?" is a tell. Real writers do not want a help desk. They
   want a collaborator.

2. **No story context.** It does not know which book, chapter, or
   character you are writing. Every conversation starts from zero.
   The writer ends up pasting their own paragraphs back into the
   chat for context.

3. **One hidden model.** The writer cannot choose Claude vs GPT vs
   Gemini. The model is whatever Groq's Llama is configured to,
   abstracted away. For a serious writer this is a downgrade from
   the free experience they already get at claude.ai or chatgpt.com.

### What The Studio fixes

**The Studio** is a complete replacement, not a redesign of the
current panel. Three pillars define it.

#### Pillar 1, A panel of minds, not a chatbot

Every conversation opens with a clearly visible **model selector**
at the top of the panel: Claude, GPT, Gemini, Grok, and Llama
displayed as four to five animated chips with the model's
signature color and one-line strength tag.

Choosing a model is part of the writing craft. A scene of
emotional dialogue belongs to Claude. A high-concept plot twist
belongs to GPT-5. A research question about the Crusades belongs
to Gemini's grounding. The Studio makes this choice first-class.

Bonus: **Compare Mode**. Ask the same question to two or three
models at once. Read the answers side by side. Insert the best one.
This is unique to The Studio. No other writing platform does this.

#### Pillar 2, Story-aware by default

The first message of every Studio conversation is automatically
seeded with structured context the model can use:

- The book title, genre, and one-line description
- The current chapter title and the last paragraph the writer wrote
- Selected text in the editor (if any)
- The relevant lore entries (characters, locations, items)
- The chapter's place in the overall story arc

The writer never sees this preamble. The model does. The writer
just asks "what would Sarah say here?" and Claude answers with
Sarah's voice, knowing she is grieving her brother, lives in
1920s Damascus, and speaks formal Arabic when she lies.

#### Pillar 3, Production-grade design

The Studio looks expensive. Specific design decisions:

- A **subtle aurora glow** behind the model selector, color
  shifts based on the active model.
- **Streaming text with a typewriter cursor** that breathes.
- **Per-model avatars** with one-frame transition animations
  when switched.
- A **glass morphism panel** with a 1px purple inner stroke and
  a tasteful drop shadow.
- **Quick action chips** under the input ("Continue from cursor",
  "Critique this paragraph", "Generate dialogue for {character}",
  "What if?") that swap based on what is selected in the editor.
- **One-click "Insert at cursor" button** on every AI response,
  drops the text into the chapter exactly where the writer left
  off.

Every interaction is meant to feel like a Notion / Linear /
Arc browser feature, not a 2023 chatbot.

---

## Part 2, UI / UX Sketch

```
┌──────────────────────────────────────────────────────────┐
│  ✦ The Studio                                        ✕   │
│  ─────────────────────────────────────────────────────   │
│                                                          │
│   ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐          │
│   │CLAUDE│ │ GPT  │ │GEMINI│ │ GROK │ │LLAMA │           │
│   │ 4.5  │ │ 5.0  │ │ 2.5  │ │  4   │ │ 70b  │           │
│   └──────┘ └──────┘ └──────┘ └──────┘ └──────┘          │
│   active ──╯                                             │
│                                                          │
│   Reading: Chapter 3, "The Door That Was Not"            │
│   Characters in scene: Tariq, Layla                      │
│   Last paragraph: "Layla looked at the dusty handle..."  │
│                                                          │
│   ─────────────────────────────────────────────────────  │
│                                                          │
│   YOU                                                    │
│   What would Tariq say next? He is scared but trying     │
│   to hide it from Layla.                                 │
│                                                          │
│   CLAUDE 4.5                                            │
│   Tariq, given his trained calm and the way he has       │
│   masked fear before with Layla, would probably          │
│   deflect with action rather than words...               │
│                                                          │
│   "Stay back," he said, his hand already on the          │
│   handle. "I'll go first."                               │
│                                                          │
│   [▼ Insert at cursor]  [⇄ Compare with GPT]  [⟳ Retry]  │
│                                                          │
│   ─────────────────────────────────────────────────────  │
│                                                          │
│   ✦ Quick actions:                                       │
│   [Continue here] [Critique selection] [Dialogue: Layla] │
│   [What if Tariq backs out?]                            │
│                                                          │
│   ─────────────────────────────────────────────────────  │
│   ⌨️  Ask anything about your story...           [→ Send] │
└──────────────────────────────────────────────────────────┘
```

### Compare Mode

When the writer clicks "Compare with GPT", the panel splits
horizontally and both responses stream in parallel:

```
┌─────────────────────────────────────────────────────────┐
│   YOU                                                   │
│   What would Tariq say next?                            │
│                                                         │
│   ┌──────────── CLAUDE ─────────────┬─── GPT-5 ───────┐ │
│   │ "Stay back," he said, his hand  │ Tariq held up   │ │
│   │ already on the handle.          │ his hand, palm  │ │
│   │ "I'll go first."                │ flat, the way   │ │
│   │                                 │ his father had  │ │
│   │ [▼ Use this]                    │ once told him   │ │
│   │                                 │ to do.          │ │
│   │                                 │                 │ │
│   │                                 │ [▼ Use this]    │ │
│   └─────────────────────────────────┴─────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Color system per model

Each model has its own brand color, used in the chip border,
the streaming cursor, and the avatar dot:

| Model | Primary | Use case label |
|---|---|---|
| Claude | warm amber (#D97757) | Dialogue, character depth, prose polish |
| GPT-5 | OpenAI green (#10A37F) | Plot, structure, bold ideas |
| Gemini | Google blue (#4285F4) | Research, grounding, facts |
| Grok | X gray (#1D9BF0) | Unconventional voice, satire |
| Llama | Meta purple (#7C3AED) | Local fallback, free tier |

The active model's color tints the entire panel chrome,
subtly. The writer feels who they are talking to.

---

## Part 3, Feature Breakdown

### Must-have (Phase 1, the launch)

1. **Multi-model selector.** Five chips at the top. Live status
   per model (some may be quota-exceeded; show gray).

2. **Story-aware context injection.** Automatic preamble sent to
   the model with book title, chapter title, selected text, lore
   entries for the current chapter's characters.

3. **Streaming responses.** Tokens appear as they arrive. Each
   model uses its respective streaming SDK.

4. **Insert at cursor.** A button on every AI response that
   places the text into the editor exactly at the current
   cursor position. Handles RTL Arabic correctly.

5. **Chat history per chapter.** Persistent. The writer reopens
   the chapter and the previous Studio conversation is right there.

6. **Quick actions.** Six prebuilt chips that swap based on
   editor selection state:
   - Nothing selected: "Continue from cursor", "Brainstorm next
     scene", "Dialogue: {character}", "Open with a question"
   - Text selected: "Polish this", "Critique", "Rewrite from
     {character}'s POV", "Make this shorter"

7. **Themed glass UI.** Aurora glow, glass morphism, smooth
   open/close animation, per-model color tint.

### Should-have (Phase 2, two weeks after Phase 1)

8. **Compare Mode.** Ask two models the same question
   side-by-side.

9. **Conversation export.** Save useful Studio conversations to
   the chapter's notes or to a Research board entry.

10. **Per-model strength labels.** A small tag under each chip
    that says "Best for dialogue" or "Best for plot", configurable.

11. **Markdown rendering.** Headers, bold, lists, code blocks.

12. **Cost transparency.** A tiny "used $0.02 today" line at the
    bottom for transparency.

13. **Keyboard shortcut.** Cmd+J / Ctrl+J opens The Studio
    instantly.

### Nice-to-have (Phase 3, future)

14. **Voice input.** Press and hold to dictate the prompt.

15. **Templates library.** Saved prompts the writer reuses across
    books (e.g., "Generate a chapter outline from this beat").

16. **AI-suggested next move.** A passive "✦ Try this" pulse on
    the Studio button when the writer pauses for 60 seconds,
    suggesting a specific quick action based on what they just
    wrote.

17. **Inline AI margins.** Tiny pencil icons in the right margin
    of each paragraph that open The Studio pre-filled with
    "Critique this paragraph".

18. **Multi-turn agentic flow.** The writer asks "rewrite the
    whole scene in past tense" and Claude does it across many
    paragraphs, the writer reviews diffs.

---

## Part 4, Technical Architecture

### Provider abstraction

A clean `AiProvider` interface lives in
`artifacts/api-server/src/lib/ai/`:

```typescript
interface AiProvider {
  id: "claude" | "gpt" | "gemini" | "grok" | "llama";
  displayName: string;
  modelId: string;
  streamChat(messages: AiMessage[], opts: StreamOpts): AsyncIterable<string>;
}
```

Five concrete implementations:

- `claudeProvider` using `@anthropic-ai/sdk` with model
  `claude-4-7-sonnet` (latest as of 2026-06).
- `gptProvider` using `openai` SDK with model `gpt-5`.
- `geminiProvider` using `@google/generative-ai` with model
  `gemini-2.5-pro`.
- `grokProvider` using OpenAI-compatible SDK pointed at x.ai
  with model `grok-4`.
- `llamaProvider` using OpenAI-compatible SDK pointed at Groq
  (free tier, current fallback).

A registry pattern (`getProvider(id)`) makes adding a new model
a one-file change.

### API key storage

API keys live in the API server's environment variables, not
in the database. Each writer uses Faris's keys (the standard
SaaS model). Faris can disable a provider per environment by
omitting its key, the UI grays out that chip.

```env
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GOOGLE_AI_API_KEY=AIza...
XAI_API_KEY=xai-...
GROQ_API_KEY=gsk_...
```

### New API endpoints

Three endpoints on the backend:

```
POST /api/studio/chat
  body: { provider, messages, bookId, chapterId, selection? }
  returns: streaming text/event-stream

GET /api/studio/conversations/:chapterId
  returns: { messages: AiMessage[] }

POST /api/studio/conversations/:chapterId
  body: { message }
  returns: { id }
```

Server-side, the chat endpoint:

1. Authenticates the writer and validates ownership of the book
   and chapter.
2. Loads the lore entries for the chapter.
3. Builds the system prompt (story context preamble).
4. Calls the chosen provider's `streamChat`.
5. Streams the response back via Server-Sent Events.
6. On completion, persists the user message and assistant
   response to the `studio_messages` table.

### New database tables

Two new tables in `lib/db/src/schema/index.ts`:

```typescript
// One conversation per (book, chapter) per writer.
studio_conversations {
  id, userId, bookId, chapterId, createdAt, updatedAt
}

// Messages within a conversation.
studio_messages {
  id, conversationId, role, content, providerId, tokenCount,
  costCents, createdAt
}
```

Indexes on `(userId, chapterId)` for fast lookup.

### Frontend architecture

The Studio replaces both the current `AiChatPanel.tsx` and
`ai-assistant.tsx`. A new component tree:

```
src/components/studio/
  Studio.tsx              // Top-level panel (slide-in)
  ModelSelector.tsx       // The chip row
  ContextHeader.tsx       // "Reading: Chapter 3..." block
  ChatStream.tsx          // The conversation thread
  Message.tsx             // Individual message bubble
  QuickActions.tsx        // The chip row under the input
  Composer.tsx            // The input + send button
  CompareMode.tsx         // Phase 2 split view
  lib/
    use-studio.ts         // The main hook (state + actions)
    use-stream.ts         // SSE consumer
    use-insert-at-cursor.ts // TipTap insertion helper
    providers.ts          // Frontend metadata: colors, labels
```

State management with TanStack Query plus a Zustand store for
the active model and panel open state.

### Streaming protocol

Server-Sent Events. The server sends `data: {chunk}` lines as
tokens arrive from the provider, then `data: [DONE]` to close.
The frontend consumer pushes each chunk into a React state
buffer, no third-party SSE library needed.

### Cursor insertion

The Studio panel holds a ref to the active TipTap editor. The
"Insert at cursor" button calls
`editor.chain().focus().insertContent(text).run()`. RTL Arabic
is handled by the existing TipTap config that already powers
the chapter editor.

### Cost tracking

Each provider's response includes a token count. We store
`tokenCount` and a computed `costCents` per message based on
the model's published per-million-token rates. A small footer
in The Studio shows today's usage, and the admin panel gets a
new "Studio Costs" tab.

---

## Part 5, Implementation Phases

### Phase 1, The Launch (8 to 10 days of work)

The minimum viable Studio. Everything labeled "Must-have"
above. Result: writers see a beautifully redesigned, context-
aware, multi-model AI companion inside the chapter editor.

Day-by-day breakdown:

- **Days 1 to 2:** Build the provider abstraction. Add the four
  new SDKs. Implement `streamChat` for each. Test each provider
  in isolation with hardcoded prompts.

- **Days 3 to 4:** Database schema + new API endpoints. Story
  context preamble builder. SSE streaming on the backend.

- **Days 5 to 7:** Frontend Studio component tree. Glass panel,
  model selector, streaming chat. Insert at cursor for TipTap.

- **Days 8 to 9:** Quick actions + story context header +
  per-chapter conversation persistence.

- **Day 10:** Polish. Animations. Per-model color tinting. Empty
  state. Error states (provider quota exceeded, no API key,
  network down).

Deletion plan: remove `AiChatPanel.tsx`, `ai-assistant.tsx`,
the existing "Writing Assistant" button. Remove their i18n
keys. Migrate any chat history if relevant.

### Phase 2, Differentiation (5 to 7 days)

Compare Mode. Cost transparency. Markdown rendering. Keyboard
shortcut. Strength labels per model. Conversation export.

### Phase 3, Magic (10 to 14 days, opt-in)

Voice input. Templates library. AI-suggested next move.
Inline AI margins. Multi-turn agentic flow.

---

## Part 6, Cost Analysis

### API cost per writer per month (estimated)

Assuming a moderate writer uses The Studio for 60 prompts per
week, average 1,500 tokens in and 800 tokens out per call:

| Model | Input cost | Output cost | Per call | Monthly per writer |
|---|---|---|---|---|
| Claude 4.5 | $3 / M tok | $15 / M tok | $0.017 | $4.10 |
| GPT-5 | $5 / M tok | $20 / M tok | $0.024 | $5.76 |
| Gemini 2.5 Pro | $2.50 / M tok | $10 / M tok | $0.012 | $2.88 |
| Grok 4 | $5 / M tok | $15 / M tok | $0.020 | $4.80 |
| Llama 70B (Groq) | free tier | free tier | $0 | $0 |

If every writer used the most expensive model every time,
worst case = $5.76 per writer per month.

### Cost-control strategies

1. **Free tier writers default to Llama** (the existing Groq
   fallback). Premium models behind a one-time hint:
   "Claude and GPT use real money, donate if you find it useful".

2. **Per-writer daily quota** on premium models. We already have
   the `tier-limits.ts` and `daily_ai_usage` table, extend them
   to track per-provider usage.

3. **Conversation context truncation.** Old messages get
   summarised after 10 turns to keep token costs flat.

4. **Cache common prompts.** Anthropic prompt caching halves
   the cost of long context preambles.

### Estimated runway with 100 writers

Worst case: 100 writers x $5.76 = $576 per month. Realistic
case (40% use Llama, 30% Gemini, 20% Claude, 10% GPT):
~$280 per month. Affordable with donations.

---

## Part 7, Differentiators in the Market

Plotzy with The Studio would be the **only writing platform** I
know of that gives writers:

1. **Multi-model choice inside the editor.** Sudowrite has one
   model. NovelCrafter has one model. Squibler has one model.
   None expose Claude, GPT, Gemini side by side as a writing
   workflow.

2. **Compare Mode.** Nobody does this for fiction writing.

3. **Story-aware by default.** Some tools have story bibles.
   Few actually inject them into every AI call without the
   writer pasting them.

4. **Production design.** Most writing platforms have AI
   features that look like 2023 chatbots. The Studio looks
   like a 2026 native app.

This is a feature you can put at the top of the Plotzy landing
page, demo in 30 seconds, and have writers actually want to
sign up to try.

---

## Part 8, Open Questions for Faris

Before I start building Phase 1, I need decisions on:

### 1. Models to ship at launch

- All five (Claude, GPT, Gemini, Grok, Llama)?
- Or start with three (Claude, GPT, Gemini) and add the rest
  in Phase 2?

My recommendation: **start with four** (Claude, GPT, Gemini,
Llama). Skip Grok for v1 (small audience, x.ai's API is less
stable, and adding it is a one-day job later).

### 2. Free vs paid model tiers

- Should free users get access to Claude and GPT, or only Llama?
- If only Llama, should the premium-model chips be visible but
  greyed out with "Donate to unlock"?

My recommendation: **all writers get all models, but with a
per-writer daily quota** that resets at midnight. The quota for
premium models is small (10 calls/day) and unlimited for Llama.

### 3. Conversation persistence

- Persist per writer + per chapter (so writer can open multiple
  conversations across chapters)?
- Or one shared conversation per chapter that any collaborator
  can see (matches the collaboration feature)?

My recommendation: **per writer + per chapter** for privacy.
Phase 3 can add a "share this conversation" feature.

### 4. The button placement

- Keep the "Talk with AI" floating button in the editor (like
  now)?
- Or surface The Studio as a permanent right-side panel that
  can be collapsed?

My recommendation: **the floating button stays** but renamed
to "The Studio", and the panel slides out the same way. Less
disruptive to the existing layout, easier to test.

### 5. Naming

- "The Studio" feels premium and matches "Audiobook Studio".
- Alternatives: "Plotzy AI", "The Council", "AI Companion",
  "Co-Writer", "Muse", "Atelier", "The Workshop".

My recommendation: **The Studio**. Short. Consistent with the
brand. Distinctive.

---

---

## Part 9, Decisions (Confirmed by Faris)

Confirmed on 2026-06-19:

1. **Launch models:** Claude, GPT, Gemini, Llama. Grok added in
   Phase 2.

2. **Tiered limits, reasonable not punishing:** Daily caps per
   provider, calibrated to support a real writing session per
   day on premium models. Llama stays unlimited as the always-on
   fallback.

   - Llama 70B: unlimited
   - Gemini 2.5 Pro: 25 messages/day
   - Claude 4.5: 20 messages/day
   - GPT-5: 15 messages/day

   These resets at midnight UTC. The Studio shows a small ring
   per model indicating remaining quota at a glance.

3. **Conversation persistence model:**
   - **Multiple conversations per writer per chapter.**
   - Writer clicks "+ New conversation" any time to start fresh.
   - All conversations persist forever (until manually deleted).
   - Conversations can be pinned, archived, renamed.
   - Switching between conversations is instant from the
     sidebar.
   - The Studio loads the writer's most recently active
     conversation on open.

4. **Button:** keep the floating "Talk with AI" button, rename
   to "The Studio".

5. **Name:** **The Studio**.

---

## Part 10, Extra Creative Differentiators (added by request)

Beyond the original plan, these features push The Studio from
"the best AI writing assistant" to "the only one that feels
like it was designed by a writer".

### 10.1 Conversation branching (Git for chats)

Every assistant message has a `↳ Branch from here` button.
Clicking it creates a new conversation pre-loaded with the
context up to that point. The writer can explore "what if
Claude went a different direction" without losing the
original thread.

Branched conversations show a 🌿 icon and a link back to
their parent so the writer can navigate the tree.

### 10.2 Smart conversation auto-titles

After the third message in a new conversation, a low-cost
Llama call generates a five-word title (e.g., "Sarah meets the
stranger", "Plot twist for chapter 3"). The writer can rename
it at any time. No more "Untitled chat".

### 10.3 Direct AI actions on selected text

When the writer highlights a paragraph and right-clicks
inside the editor, the context menu adds a new section:

```
─────────────────────────
✦ Polish with The Studio
✦ Rewrite from {character}'s POV
✦ Critique this paragraph
✦ Continue from here
✦ Show me 3 alternatives
─────────────────────────
```

One click sends the selection to the current model with the
right prompt. No need to open the panel and copy-paste.

### 10.4 Visual conversation insights

In the conversations sidebar, each conversation shows a
small color bar at the bottom indicating which models were
used in it:

```
Sarah's intro                    [████░░░░] Claude-heavy
Plot brainstorm                  [░░██░░██] Mixed
Quick polish session             [████████] Llama-only
```

At a glance the writer sees the "personality" of each
conversation without opening it.

### 10.5 Story Pulse

A small breathing dot (the Studio brand mark) sits in the
panel header. When the writer is actively writing, the dot
pulses warm purple, indicating The Studio is alive in the
current context. When idle, it dims. Subtle, ambient
feedback that the AI is aware of the work in progress.

### 10.6 Conversation export

Every conversation has an "Export to chapter notes" button.
The conversation gets saved as a markdown block in the
chapter's Research tab so the writer can refer back to it
without re-opening The Studio.

### 10.7 Multi-conversation tabs (Phase 2)

At the top of the chat area, the three most recently used
conversations appear as browser-style tabs. Switching is one
click, no sidebar navigation needed.

### 10.8 Smart resume

When the writer opens a chapter after a few days, The Studio
greets them with a single-line summary of where the last
conversation left off: "Last session: Claude helped polish
the opening dialogue between Tariq and Layla". Click to
resume that conversation, or start a new one.

---

## Implementation order (starts now)

Phase 1A — Schema (today)
  - studio_conversations table with multi-conversation support
  - studio_messages table with provider attribution + cost
    tracking
  - daily_provider_usage table for the per-model quotas

Phase 1B — Backend abstraction (today + tomorrow)
  - AiProvider interface
  - Four providers: Claude, GPT, Gemini, Llama
  - System prompt builder (story context preamble)
  - SSE streaming

Phase 1C — Backend endpoints (day 3)
  - /api/studio/chat (POST, streaming)
  - /api/studio/conversations (GET list, POST create)
  - /api/studio/conversations/:id (PATCH rename/pin/archive,
    DELETE)
  - /api/studio/conversations/:id/messages (GET history)
  - /api/studio/quotas (GET remaining per model)

Phase 1D — Frontend Studio shell (days 4 to 6)
  - Studio.tsx panel with glass design
  - ModelSelector with per-model colors + quota rings
  - ConversationSidebar with pinning, archive, search
  - ChatStream with streaming and markdown rendering
  - Composer with quick actions
  - Insert at cursor TipTap integration

Phase 1E — Story-awareness + polish (days 7 to 8)
  - Context header showing chapter title, characters in scene
  - System prompt injection of lore entries
  - Animations: model switch crossfade, glass blur, aurora glow
  - Empty states and error states

Phase 1F — Removal of old assistant + tests (day 9 to 10)
  - Delete AiChatPanel.tsx, ai-assistant.tsx
  - Migrate any preserved chat history (best effort)
  - Final QA on Arabic RTL paths

Then Phase 2 starts: Compare Mode, branching, auto-titles,
right-click actions, visual insights, Story Pulse, export,
tabs.

Building starts now. Next commit is the schema migration.
