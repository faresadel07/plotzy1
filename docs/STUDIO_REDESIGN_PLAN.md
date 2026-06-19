# The Studio — Redesign Plan v2

Based on direct feedback from Fares after testing v1 locally:

1. Each model chip needs the actual brand logo, not just a colored dot.
2. The colors and look do not match Plotzy. The site is pure black with
   white text and minimal accent. The purple has to go.
3. The book pages should stay visible behind / next to the Studio so a
   writer can copy from the page into the chat and back.
4. The floating "Talk with AI" button looks too small and the color
   does not fit Plotzy. It needs a complete redo.

Below is the plan to fix all four. Read top to bottom, push back on
anything you want changed, then say "approved" and I start.

---

## Change 1, The layout (the biggest fix)

### Today (wrong)

The Studio opens as a full screen overlay over the whole editor. The
writer loses sight of the chapter completely. Copy / paste between
the page and the chat requires closing the panel, copying, reopening.

### After

The Studio becomes a **right-side panel** that slides in over the
right edge of the screen:

- Width: **420 px on desktop, resizable 360-560 px** by dragging the
  left edge.
- The chapter editor stays mounted on the **left**, fully scrollable
  and editable. Its right padding grows by the panel width so no text
  hides behind the panel.
- The writer can highlight any paragraph in the chapter, copy it,
  paste it into the chat input. They can also highlight an AI
  response, copy it, paste into the chapter. (Plus the existing
  "Insert at cursor" button on each AI message.)
- On phone screens narrower than 720 px, the panel falls back to
  full screen (no other choice, the editor is unusable that small).

```
DESKTOP LAYOUT (Studio open)

┌─────────────────────────────────────┬───────────────────┐
│                                     │  ✦ The Studio   ✕│
│   Chapter editor                    │  Ask anything…    │
│   (left-aligned, scrolls            │  ──────────────── │
│   independently)                    │  [ C ] [ G ] [G]  │
│                                     │  [ L ]            │
│   Lorem ipsum dolor sit amet,       │                   │
│   consectetur adipiscing elit.      │  YOU              │
│   Sed do eiusmod tempor             │  Polish this:     │
│   incididunt ut labore et dolore    │  "lorem ipsum…"   │
│   magna aliqua.                     │                   │
│                                     │  CLAUDE 4.5       │
│   Ut enim ad minim veniam,          │  Here is a tigh-  │
│   quis nostrud exercitation…        │  ter version…     │
│                                     │  [Insert] [Copy]  │
│                                     │  ───────────────  │
│                                     │  Type a message → │
└─────────────────────────────────────┴───────────────────┘
   << editor area, ~62% width           Studio fixed sidebar
```

### Why this matters

The writer is doing one continuous job: write, ask, paste, write,
ask. Hiding the page during the ask is the single biggest UX flaw
of the current panel. Side-by-side fixes it.

---

## Change 2, The visual identity (pure black, zero purple)

### Today (wrong)

- Background uses a navy / dark-gray gradient and a glass blur.
- The brand accent everywhere is `#7C3AED` purple (chips, glow, send
  button, scroll bar). That purple is not a Plotzy color. The rest of
  the site is pure black with white text.
- An "aurora glow" tints the panel purple at all times.

### After

A pure Plotzy palette. Same vocabulary the rest of the site already
uses, applied here.

- Panel background: **#000** (pure black, matches the donate page and
  the rest of the site).
- Card / message bubble backgrounds: **rgba(255,255,255,0.04)** (the
  same subtle off-black used in the chapter list and admin panel).
- Borders: **rgba(255,255,255,0.08)** everywhere (same as the rest of
  the site's hairlines).
- Text: **#fff** for primary, **rgba(255,255,255,0.65)** for secondary,
  **rgba(255,255,255,0.4)** for placeholder / muted.
- Active state for buttons / chips: **white 1px border + white
  background tint** (no purple).
- The aurora glow: deleted.
- The streaming cursor: white, not colored.

The per-model brand colors stay, but **only inside the model chip
itself**, never bleeding into the rest of the panel. The chat,
the borders, the send button: all monochrome black + white.

```
BEFORE                            AFTER
┌──────────────┐                  ┌──────────────┐
│ ░░░ glow ░░░ │                  │              │
│              │                  │              │
│ [● Claude] ← │                  │ [▲ Claude] ← │
│  purple      │                  │  black bg,   │
│  glow        │                  │  white edge  │
│              │                  │              │
│ Send (purple)│                  │ Send (white) │
└──────────────┘                  └──────────────┘
   Sci-fi cyber                      Plotzy native
```

---

## Change 3, Real brand logos in each chip

### Today (wrong)

Each chip shows a colored dot and the text name. No visual identity.
Looks identical to a status indicator. A writer who knows Claude or
GPT visually does not feel them.

### After

Each chip shows the **actual brand mark of the model**, drawn as a
small SVG icon. Recognisable in half a second:

| Model | Icon | Brand colour (kept only inside the chip) |
|---|---|---|
| Claude 4.5 | The Anthropic starburst (5-point asterisk) | warm amber `#D97757` |
| GPT-5 | The OpenAI petal / flower mark | OpenAI green `#10A37F` |
| Gemini 2.5 | The Gemini gradient gem | Google gradient blue / pink |
| Llama 3.3 | The Meta infinity ribbon | Meta blue `#1877F2` |

The icons are inline SVGs that I will hand-write from public
references in the new file `components/studio/icons.tsx`. No new
dependency, no PNG fetching.

```
Chip layout:

┌────────────────────────┐
│ [✦]  Claude 4.5  12/20 │
└────────────────────────┘
  ↑                ↑
  brand icon       per-day quota
  (true colour     (lights up red
   only inside     when used up)
   the chip)
```

Inactive chip: black background + white border at 8% opacity. Active
chip: white border at 30% opacity, white-tinted background, brand
icon glows slightly. No coloured rings, no aurora.

---

## Change 4, The floating "The Studio" button

### Today (wrong)

A small purple pill that says "The Studio" with a wand. Purple is
off-brand. The size is too small to feel like a primary action. The
wand icon is generic.

### After

A bigger, monochrome, on-brand floating action button.

Two options, pick one:

### Option A — Black pill with a distinctive mark

```
   ┌─────────────────────────┐
   │  ⟢   Studio          │   45 x 160 px pill
   └─────────────────────────┘   black bg, white text + icon
                                 1 px white border at 12% opacity
                                 soft black shadow underneath
```

Pros: keeps the "label" the writer can read.
Cons: still a "button", less distinctive.

### Option B — Round black mark with a logo (the more premium move)

```
       ┌─────┐
       │  ⟢  │   54 x 54 px circle
       └─────┘   black bg, white logo
                 1 px white border at 12% opacity
                 floats above the editor like an Apple FAB
                 small "Studio" tooltip on hover
```

Pros: cleaner, more premium, matches Notion / Linear / iA Writer.
Cons: no label until hover.

**My recommendation: Option B.** Plotzy is a writing app where the
button needs to disappear when the writer is in flow. A small round
mark fades into the page and only invites attention when the writer
looks for it. The label (Studio) is one keyboard shortcut + one
tooltip away.

The icon inside: a hand-drawn 2-line mark, like a stylised pen plus
spark. I will draw it in SVG, no third-party icon.

---

## Bonus, the empty state

Currently the empty state says "How can I help today?" with four
example questions. Same vibe as a generic ChatGPT app. I will rewrite
it to feel like Plotzy:

```
                  ⟢

        The Studio is listening.

   Highlight a paragraph and ask me to polish it.
   Tell me what your character should say next.
   Or just type. I know the book.

      Press Cmd+Enter to send.
```

Smaller, calmer, more confident. No bullet list of suggestions.

---

## What I will NOT change

Just to be explicit, the following work as planned and stay:

- The four-model selector (Claude, GPT, Gemini, Llama).
- The per-conversation sidebar with pin / archive / delete.
- The streaming chat with per-message Insert / Copy.
- The daily quotas per model.
- The story-aware system prompt (book, chapter, lore injection).
- All eight backend endpoints. None of the redesign touches the API.

This redesign is **frontend only**. After approval, total work is
~6 hours of focused frontend work. No database changes. Nothing for
you to redeploy on Railway (which is paused anyway).

---

## What I need from you

Reply with one of:

- **"approved"** — I start immediately, ship in one commit, you reload
  localhost and see the new design.
- **"approved with changes"** + your changes — I adjust the plan and
  start.
- **"button option A"** or **"button option B"** if you want to lock
  in the floating-button choice now. If you do not say, I will go
  with Option B (round mark).

Once approved, the implementation order is:

1. New icon library: `components/studio/icons.tsx` with the four brand
   marks and the new Plotzy "Studio" logo.
2. Repaint Studio.tsx with the pure-black palette (5 minutes of CSS
   delete-and-replace).
3. Convert the panel from a full-screen overlay into a 420px right
   sidebar that pushes the editor's right padding.
4. Replace the floating button with the new round mark.
5. Rewrite the empty state.
6. Commit, push, you reload localhost.

Estimated time from "approved" to "reload localhost": **90 minutes**.
