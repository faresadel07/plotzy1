# Module 2: Architecture — Content Outlines

**Batch:** 2.2 · **Branch:** `feat/course-batch-2-2-module-architecture` · **Master tip:** `f3cfd60`
**Module slug:** `architecture` · **4 lessons, ~5,000–6,700 words total**

---

## L3 slug rename — required as part of this batch

Module 2 L3 was originally seeded as `architecture-save-the-cat` with title "Save the Cat beat sheet" (Batch 1.1). "Save the Cat!" is Blake Snyder's 2005 trademarked book and 15-beat system — we cannot use the brand name, the structure he authored, or the catchphrase. Per your directive, the lesson teaches the *concept* of beat sheets generically.

Required migrations in Phase B:

1. **`lib/db/scripts/seed-course.ts`** — `MODULES` catalog: rename `architecture-save-the-cat` → `architecture-beat-sheets`, retitle "Save the Cat beat sheet" → "Beat Sheets and Granular Structure".
2. **`lib/db/scripts/seed-course.ts`** — add a new `applyLessonRenames()` pass that runs *before* `updateLessonContentFromFiles`. Detects rows with the old slug, UPDATEs to the new slug + title. Idempotent (no-op once applied; future runs find no matches).
3. **`artifacts/plotzy/public/sitemap.xml`** — replace the `/learn/lesson/architecture-save-the-cat` entry with `/learn/lesson/architecture-beat-sheets`.
4. **`lib/db/content/foundation/foundation-three-ingredients.md`** — Module 1 L4's closing paragraph currently reads "Save the Cat as a checking tool, not a religion." Replace with "Beat sheets as a checking tool, not a religion." (The seed's content-file pass will pick this up automatically on the next run.)

Out of scope: `artifacts/plotzy/src/pages/writing-guide.tsx:142` references "Save the Cat! Beat Sheet" but that's the pre-existing legacy writing-guide page, not course content. The course-content rule (the trigger for this rename) doesn't extend retroactively to other pages. Logged as a separate concern, not part of this batch.

---

## Voice & sourcing rules (carried from Module 1, locked)

Same conventions as Module 1. Briefly:

- Public domain only in the body and Further reading. Modern research described as phenomenon, never cited. No modern-author name-drops.
- Conversational but precise. Short paragraphs. One key idea per paragraph. Direct address.
- Aphoristic moments where they emerge naturally; don't force, don't soften.
- Concrete invented examples preferred over famous-title drops.
- Each lesson ends with `## Try it` exercise(s) under explicit constraints.
- 3–5 Project Gutenberg "Further reading" entries per lesson.
- No corporate phrases ("let's dive in", "in this lesson we'll", etc.).
- "Save the Cat" specifically: do not name. Teach beat sheets generically.

---

## Cross-lesson arc

Module 2 zooms from the most general structural shape to the most granular, then steps back to ask which one the student's own premise actually wants.

| Lesson | Question | What it does |
|---|---|---|
| 1. The 3-Act Structure | "What is structure for?" | Establishes the default and explains why it's the default |
| 2. The Hero's Journey, simplified | "Is there a deeper pattern under the 3 acts?" | Reveals the transformation pattern most stories rhyme with |
| 3. Beat Sheets and Granular Structure | "What if I want a tighter map?" | Granular checkpoints for writers who think in beats |
| 4. Choosing your structure | "Which one for *my* story?" | Synthesises L1–L3; warns against force-fitting |

By the end of Module 2 the student can: place a story in 3 acts, name the major beats of a hero's-journey shape without consulting a chart, build their own 8–10 beat sheet, and decide which (if any) of these tools their premise needs.

**Callbacks to Module 1:**
- L1: structure is how the three ingredients (M1 L4: character, conflict, change) get *delivered* across pages — without it, the ingredients never reach the reader.
- L2: the hero's journey is mostly an architecture for *change* (M1 L4's third ingredient).
- L3: beat sheets are useful when you need to make sure the want/obstacle/change rhythm (M1) is hitting at the right intervals.
- L4: the student tests their 100-word premise (M1 L3) against each of the three structures and picks one — or none.

**Callbacks within Module 2:**
- L2 references L1's act ratios once when discussing where the "ordeal" tends to fall.
- L3 references L1 and L2 once each when arguing that beat sheets sit *underneath* the higher-level shapes.
- L4 references all three by name in the synthesis.

---

## Lesson 1: The 3-Act Structure

**Slug:** `architecture-three-acts` · **Length target:** 1,300–1,800 words

### Thesis
Almost every story you have ever loved follows a three-act shape, even when its writer wasn't thinking about three acts. The shape isn't a rule someone invented; it's the shape that emerges when you take the want/obstacle/change pattern from Lesson 1 and stretch it across enough pages to fill a book. Knowing the shape lets you diagnose a saggy middle without waiting for a beta reader to tell you it's saggy.

### Section structure

1. **Why three** — *~250 words*
   - A two-act story is a setup with no resolution, or a resolution with no setup. A four-act story is a three-act story with the second act split, but the *shape* is still three.
   - Aristotle wrote (about tragedy) that a story has a beginning, middle, and end. Centuries later Freytag drew it as a pyramid with five points, but the pyramid is a three-act shape with the middle expanded. People keep arriving at three because three is what the want/obstacle/change pattern actually wants.

2. **Act 1: setup, inciting incident, lock-in** — *~350 words*
   - The first quarter of your book. Roughly 25% of the page count.
   - Three things must happen, in order:
     - **Setup** — show us the protagonist's normal life and the want they didn't know they had.
     - **Inciting incident** — something happens that disturbs the normal. The promotion she didn't get (callback to M1 L1's example). The spirits at the door. The cousin's letter.
     - **Lock-in** — the protagonist crosses a threshold they cannot un-cross. The decision that means "I cannot go back to my old life." This is the end of Act 1.
   - Common Act 1 mistake: the protagonist *reacts* to events but never *commits*. Without lock-in, Act 2 can't begin — the story will just keep introducing.

3. **Act 2: complications, midpoint, dark moment** — *~400 words*
   - The middle half of your book. Roughly 50% of the page count. This is where most beginners' novels die.
   - Three checkpoints:
     - **Rising complications** — the obstacles get harder, costs get higher. What worked at the start of Act 2 stops working.
     - **Midpoint reversal** — at the middle of the middle, something shifts. Either the protagonist learns a truth that reframes everything, or the obstacle reveals itself to be larger than they thought. This is where 50%-of-the-book stories find their second wind.
     - **Dark moment** — late Act 2. Everything the protagonist tried has failed. The obstacle has won. The end of Act 2 is the lowest point in the book.
   - Without a midpoint, Act 2 sags because the rising complications never *change shape*. Without a dark moment, the climax in Act 3 has nothing to climb out of.

4. **Act 3: climax, resolution** — *~250 words*
   - Final quarter. The protagonist, having been at their lowest, applies what they've learned and confronts the obstacle. They win, lose, or learn the truth too late (the three flavours of change from M1 L4).
   - The climax is short. Usually 10–15% of the book. Then a brief resolution that shows the world after the change. The resolution exists to give the reader space to feel what just happened.

5. **Why this feels inevitable** — *~250 words*
   - The same shape appears in stories told before writing existed. It appears in five-line jokes, in nine-hour novels, in two-act plays under the surface. It appears across cultures that never read each other's literature.
   - This isn't because anyone enforced it. It's because the human brain, which evolved to track want and obstacle and change, recognises this shape as a *complete unit* of meaning. Anything shorter feels truncated. Anything longer feels meandering. Three acts is the minimum complete unit.

6. **What this gives you** — *~150 words*
   - A diagnostic tool. If your story is saggy, ask: where am I in the act count? Probably late Act 2 with no midpoint or dark moment.
   - The next two lessons offer alternatives — the hero's journey for transformation-heavy stories, beat sheets for tighter maps. But the three acts are underneath all of them.

### Public-domain anchors
- Aristotle, *Poetics* — the beginning/middle/end framing. Already cited in Module 1; one return is appropriate here.
- Freytag's *Die Technik des Dramas* (1863) — the pyramid that drew the shape explicitly for the first time. Generic mention only; no quotation.
- *Pride and Prejudice* (Austen, 1813) — clear inciting incident (the militia arrives in Meryton; Bingley takes Netherfield), lock-in (Darcy's first proposal), midpoint reversal (Pemberley + the letter), dark moment (Lydia's elopement), climax (the second proposal). Used once, briefly, to anchor the abstract.
- *A Christmas Carol* (Dickens, 1843) — a textbook 3-act in a hundred pages.
- *Frankenstein* (Shelley, 1818) — the lock-in (the creature waking) and the dark moment (Elizabeth's death) are exceptionally clear.

### Try it (writing exercise)

> **Exercise 2.1.1 — Map a story you know well.** Pick a novel or film you know thoroughly. Write down, in one short sentence each:
>
> - The **inciting incident** — the event that disrupts the protagonist's normal.
> - The **lock-in** — the choice that ends Act 1.
> - The **midpoint** — what shifts at the middle of the middle.
> - The **dark moment** — the lowest point in late Act 2.
> - The **climax** — what the protagonist confronts in Act 3.
>
> If any beat is hard to locate, write *"unclear"*. Then, in two sentences, say what it is about that story that survived a missing or weak beat. (Almost every great story breaks at least one of these on purpose. The interesting question is *which* and *why it works anyway*.)

---

## Lesson 2: The Hero's Journey, simplified

**Slug:** `architecture-heros-journey` · **Length target:** 1,300–1,800 words

### Thesis
There is a transformation pattern that appears in stories from cultures that never spoke to each other. Some scholars stretch it to seventeen stages; that's academic. The useful version has six or seven beats and tells you almost everything you need to know about why your protagonist has to leave home and come back changed. It's not a formula — it's a *gravity well*. Stories drift toward it because the human idea of "growing up" drifts toward it.

### Section structure

1. **Why this pattern recurs** — *~200 words*
   - The hero's journey appears in epic poems written before the alphabet was invented. It appears in Mediterranean myths and Norse sagas. It appears in fairy tales told by people who never read each other's literature.
   - The pattern recurs because it tracks something humans actually go through: the move from a child's world to an adult's, the leaving and the return. Whatever culture tells the story, the shape underneath is the same.

2. **The simplified beats** — *~500 words*
   - Use 6 beats, not 17:
     1. **The Call** — something arrives that asks the protagonist to leave their ordinary world. A letter, a stranger, a death, a vision.
     2. **The Refusal** — they say no. The ordinary world is comfortable. The call is dangerous.
     3. **The Mentor** — someone or something gives them a tool, a piece of knowledge, or permission to go. Often this comes *because* of the refusal — the world insists.
     4. **The Tests** — they cross the threshold. The new world is harder. They lose, they learn, they find allies.
     5. **The Ordeal** — the deepest test. Not the last test in the book; the test that *changes them*. Often near the middle of the story (callback to L1: this tends to land around the midpoint reversal).
     6. **The Return** — they come back to the ordinary world, but they cannot fit there the way they used to. Either the ordinary world has to change to accept them, or they don't return at all and the story is tragic.
   - Some versions add a seventh beat (the *boon* — the thing they bring back). Useful when present, not load-bearing.

3. **When it works** — *~250 words*
   - Use this pattern when your story is mostly about transformation. Coming-of-age. A character who must change to survive. Anything where the protagonist on the last page is fundamentally different from the protagonist on the first page.
   - The pattern works because it gives you a reason for *every* beat. The Call without a Refusal feels too easy. The Tests without an Ordeal feels meandering. The shape pays off when each beat earns the next.

4. **When it's overused** — *~250 words*
   - The shadow side of this pattern is *predictable plotting*. If a reader has seen the journey ten times, they can predict your beats from page thirty. This is the failure mode of every writer who reads books *about* the hero's journey and applies them like a checklist.
   - The cure isn't to abandon the pattern. The cure is to make the *content* of each beat surprising. The pattern says "the mentor arrives." It does not say what the mentor looks like, what they teach, or whether they're trustworthy. Most great stories that use this shape make at least one beat sideways — the mentor turns out to be the antagonist; the Refusal is permanent; the Return is to a world that has burned.

5. **Stories that break it and work anyway** — *~250 words*
   - Several of the most-loved stories in literature have *no* return. The protagonist transforms, leaves, and never comes home. The shape can collapse to five beats and still work because the *change* is what carried the reader.
   - Other stories have the beats out of order — the Mentor arrives last, the Call comes after the first Test. This works when the writer earns the inversion; it fails when the writer is just being clever.
   - The lesson is that the pattern is descriptive, not prescriptive. It describes a gravity well. You don't have to fall into it. But knowing it's there tells you what your story is *almost* doing, which tells you what it would have to do to be doing it on purpose.

6. **What this gives you** — *~150 words*
   - A second lens for your story. If 3 acts told you *when* things happen, the hero's journey tells you *why* the protagonist has to be the one things happen to.
   - If your premise from Module 1 has heavy transformation in it, this pattern will probably be useful. If not, the next two lessons offer alternatives.

### Public-domain anchors
- *The Odyssey* (Homer) — the canonical Return story. The whole second half of the poem is what happens when home doesn't fit anymore.
- *Beowulf* (anon, ~1000 CE) — three Calls in one poem (Grendel, Grendel's mother, the dragon). The third one ends differently from the first two.
- The fairy tales of *Grimm* — fairy tales pattern this so cleanly that some scholars have used them as the primary text for studying it.
- *Frankenstein* (Shelley, 1818) — the *creature's* journey, not Victor's, is the cleaner hero's journey in the book.

### Try it

> **Exercise 2.2.1 — Spot the beats.** Pick a film or novel you love that uses the hero's-journey shape clearly. In one short phrase each, identify the **Call**, the **Refusal**, the **Mentor**, an **Ordeal**, and the **Return** (or its absence).
>
> Then pick a second story you love that *breaks* the pattern at one specific beat — and works anyway. Name the beat that's missing or inverted, and say in two sentences why the story still works without it. (Examples: a Refusal that becomes permanent, a Mentor who turns out to be wrong, a Return to a world that has been destroyed.)
>
> If your second story is hard to find, that's information. It might mean the books you love lean heavier on transformation than you'd noticed.

---

## Lesson 3: Beat Sheets and Granular Structure

**Slug:** `architecture-beat-sheets` *(renamed from `architecture-save-the-cat`)*
**Length target:** 1,200–1,600 words

### Thesis
Some writers think in acts; some think in beats. A beat sheet is a granular structural map — eight to fifteen named *emotional checkpoints* that a story is supposed to hit at predictable points in its page count. Beat sheets are a tool, not a system, and like any tool they help when used well and ruin a draft when applied dogmatically.

### Section structure

1. **What a beat is** — *~200 words*
   - A beat is the smallest unit of structural intent. Larger than a scene. Smaller than an act. A beat asks one question: *what emotional shift has to happen at this point in the story for the next part to make sense?*
   - The dark moment from Lesson 1 is a beat. The Refusal of the Call from Lesson 2 is a beat. A beat sheet is what you get when you tile beats wall-to-wall through a story.

2. **Why granular maps appeal** — *~300 words*
   - Beat sheets emerged from screenwriting, where page count maps tightly to runtime and the audience's emotional pacing is being engineered minute by minute.
   - Once you know that the *likability beat* (the moment the audience decides they're rooting for the protagonist) usually lands in the first ten percent of a film, you can build it on purpose. Once you know that a *catalyst* beat usually lands around the 12% mark, you can put your inciting incident there with intent.
   - The appeal is precision. Where the 3-act structure tells you "your inciting incident lands in Act 1," a beat sheet tells you "around page 12 of a 110-page screenplay." For commercial fiction and screenwriting that level of precision is genuinely useful.

3. **The likability beat** — *~250 words*
   - One specific beat is worth pulling out: the moment a reader decides they are on the protagonist's side. Sometimes this is a small kindness shown to a stranger. Sometimes it's a flash of competence under pressure. Sometimes it's a vulnerability the character would never confess out loud.
   - The mechanism: a reader's investment is fragile in the first thirty pages. If the protagonist hasn't done *something* the reader can latch onto — emotionally, not just narratively — the reader will quietly stop turning pages. Knowing this is a beat to engineer, not a thing that happens accidentally, is half the battle.
   - This is one of the most useful generic beats to internalise even if you never write a full beat sheet for a book.

4. **Where beat sheets earn their keep** — *~250 words*
   - Commercial fiction with strict pacing expectations — thrillers, romances with reader-promise structures, page-turners.
   - Screenwriting and dramatic structure where the runtime is fixed and the page-to-minute ratio is reliable.
   - Diagnosing why a draft feels slow. Beat sheets are very good at locating the place where your draft *should* have shifted gear and didn't.

5. **Where beat sheets fail** — *~250 words*
   - Literary fiction where the pleasure is the prose-line-by-line, not the engineered emotional pacing.
   - Character studies where the structure is the *interiority*, not the events.
   - Any book where applying the beats forces a beat in for the wrong reason ("I need a midpoint reversal here so I'll invent one") rather than letting the story dictate when the beat lands.
   - The classic failure mode: the writer reads a beat sheet system, applies it religiously, and produces a book that hits every checkpoint and feels like it was written by an algorithm. The beats aren't the problem. The problem is using them to *replace* the question of what your story actually needs.

6. **What this gives you** — *~250 words*
   - A way to think about emotional pacing at higher resolution than acts.
   - A diagnostic for slow chapters: which beat is missing or weak?
   - The freedom to *not* use this tool. Beat sheets are for writers whose minds work in beats. If yours doesn't, the next lesson explains how to choose.
   - The exercise asks you to build your own beat sheet — eight to ten beats, derived from what your story actually needs, not borrowed from a template. That's the version of this tool worth having.

### Public-domain anchors
- Anton Chekhov's notebooks (drama). His remarks on *the gun on the wall in act one* are about beats — emotional checkpoints whose payoff is engineered ahead.
- Aristotle, *Poetics* (return) — the unities are the original beat-sheet impulse.
- *A Christmas Carol* (Dickens, 1843) — rereading it as a series of beats (the visit, the visions, the chains, the tomb, the morning) shows how cleanly granular structure was already at work in 19th-century prose.

### Try it

> **Exercise 2.3.1 — Build your own beat sheet.** Take the premise you wrote in [Module 1, Exercise 3.2](/learn/lesson/foundation-finding-idea). Sketch the eight to ten beats your story needs.
>
> Constraint: do not look up an existing beat sheet template. Derive the beats from what your specific story actually needs at each emotional checkpoint. Use the headings from your own intuition: *the moment we stop trusting the narrator*, *the morning after the betrayal*, *the choice that can't be undone*. The headings should be specific to your book; if any of them could be lifted into someone else's outline, that beat is too generic.
>
> Then, beside each beat, write its approximate page placement (e.g., page 30 of a 250-page book). If beats clump near the start or end with nothing in the middle, you've found the saggy section the next draft will need to fix.

---

## Lesson 4: Choosing your structure

**Slug:** `architecture-choosing-structure` · **Length target:** 1,200–1,500 words

### Thesis
You now have three structural lenses: 3 acts, the hero's journey, beat sheets. The wrong move is to pick one and force the story to fit. The right move is to look at the premise you already have and ask which lens shows you the most about *that* story. The fourth answer — *none of these* — is sometimes the correct one.

### Section structure

1. **Three tools, one story** — *~200 words*
   - The 3-act structure is the most general. Almost every story has it underneath, even if the writer wasn't thinking about it.
   - The hero's journey is a transformation pattern. It's the 3 acts seen through the lens of the protagonist's *change* arc.
   - A beat sheet is a granular map. It sits underneath either of the first two — wherever a beat sheet places a checkpoint, that checkpoint usually corresponds to an act break or a journey beat.
   - These are not competing. They are three resolutions of the same picture.

2. **When to use which** — *~400 words*
   - **Default to 3 acts** when you don't yet know what kind of story you have. Most stories are most legible at this resolution. If you can name your inciting incident, midpoint, dark moment, and climax, you have enough structure to start drafting.
   - **Reach for the hero's journey** when transformation is the engine. Coming-of-age. Survival narratives where the protagonist is unrecognisable by the end. Anything where the *internal* change is the point and the *external* events exist to provoke it. The hero's journey will give you the *why* of each beat in a way 3 acts won't.
   - **Reach for beat sheets** when you need precision and your mind already works in beats. Commercial thrillers. Romance with reader-promise pacing. Screenplay-shaped books. Any draft where you can already tell the engine is the *pacing*, not the prose.

3. **When to use none of them** — *~250 words*
   - Some stories are not held together by structural beats. Their engine is voice, or interiority, or a specific obsession the prose keeps circling. Forcing a beat sheet onto a book whose pleasure is line-by-line attention will kill the thing that makes it worth reading.
   - Literary fiction where the pleasure is the *prose*, not the events. Character studies where the structure is the slow accretion of detail. Fiction that resembles essay or memoir — where the meaning is built by *juxtaposition*, not by climax.
   - The honest answer for these: trust your reader, trust your sentences, and use the underlying 3-act shape only as a *check* late in the draft to catch genuine sag. Don't use it as a generative tool.

4. **The danger of force-fitting** — *~300 words*
   - The most common beginner mistake is to pick a structure before they've understood what their story is. They read about the hero's journey, find it exciting, and try to write a contemporary domestic drama as if it were *The Odyssey*. The result reads as if the writer is wearing a costume that doesn't fit.
   - The other version: a writer with a beat sheet treats every beat as a *requirement*. They invent a midpoint reversal because the template says one goes here, even though the story doesn't have one to give. The reader feels the inserted joint and doesn't trust the rest.
   - Structure is *descriptive* of stories that work. It is not *prescriptive* of how to make a story work. Use it to diagnose; use it to plan; do not use it to force.

5. **How to know which one** — *~250 words*
   - Pick up your premise. Read it once, slowly. Ask three questions:
     - Is the *engine* of this story external events, internal change, or pacing?
     - Is the protagonist on the last page *fundamentally different* from the protagonist on the first page?
     - Could you tell this story in a fixed page count without losing what makes it interesting?
   - External events + transformation: hero's journey.
   - External events + tight pacing: beat sheet.
   - External events + neither: 3 acts.
   - Mostly internal change, slow accretion, prose-driven: none of these. Use 3 acts as a late-draft check only.

6. **What this gives you** — *~150 words*
   - A way to choose deliberately rather than by default.
   - Permission to refuse all three when your story doesn't want them.
   - A framework that will make Module 3 (characters) and Module 4 (world) work together — those modules give you the material the structure exists to deliver.

### Public-domain anchors
- *Pride and Prejudice* — an example of 3 acts done so well it almost disappears.
- *The Odyssey* — an example of the hero's-journey shape in its purest form.
- *A Christmas Carol* — an example of granular beats inside a 3-act frame.
- *Middlemarch* (Eliot, 1871–72) — an example of a great novel that uses none of these as its primary engine. The engine is the slow weave of multiple lives.

### Try it

> **Exercise 2.4.1 — Pick the structure for your book.** Take the premise you wrote at the end of [Module 1, Exercise 3.2](/learn/lesson/foundation-finding-idea). In exactly 100 words, answer two questions:
>
> 1. Which of the four options (3 acts, hero's journey, beat sheets, or none) does your story want — and how do you know? Cite something specific in your premise.
> 2. What is the *engine* of your book — external events, internal transformation, or pacing? One sentence.
>
> Save this answer next to the premise. You'll bring both into Module 3 (Characters), where the engine you named here decides how much page-time goes to interiority vs. action.

---

## Quiz preview (5 questions, 70% to pass — applied register)

Drafted in the Q4 widow-and-beehives style from Module 1. Each tests *understanding*, not memorisation.

**Q1.** Which of the following is closest to why the 3-act structure recurs across cultures?
- (a) It was invented by Aristotle and adopted globally over 2,000 years.
- (b) It is enforced by modern publishers who reject manuscripts that don't follow it.
- (c) It is the minimum complete unit produced when a want/obstacle/change pattern is stretched across enough pages to fill a book. ✓
- (d) It is the easiest structure to teach in writing classes, so students keep encountering it.

*Explanation:* Aristotle observed (a) and Freytag drew it, but the shape predates them and appears in cultures that never read either. (b) and (d) are downstream effects, not causes. The pattern recurs because the human brain recognises it as a *complete* unit of meaning — anything shorter is truncated, anything longer drifts.

**Q2.** A writer's draft has a clear inciting incident, rising complications, a strong climax, and a resolution. Beta readers say the middle "sags." Which of the following is the most likely missing element, per Lesson 1?
- (a) The book is too long.
- (b) The midpoint reversal is missing or weak — there's nothing in the middle of the middle that re-frames the obstacle. ✓
- (c) The protagonist is not likeable enough.
- (d) The setting needs more sensory detail.

*Explanation:* "Saggy middle" is almost always a midpoint problem. Without a reversal, Act 2's complications stack linearly and the reader's pulse never rises. (a), (c), and (d) are common diagnostic distractors that don't address the structural cause.

**Q3.** A novel about an orphan who leaves home, faces a series of trials, defeats a wrong, and returns to find that home no longer fits — but the protagonist on the last page is barely different from the one on the first. Which structure is the writer mostly using, and what's failing?
- (a) The hero's journey, and the *change* beat is the missing one — the protagonist completed the external journey without internal transformation. ✓
- (b) A beat sheet, and the likability beat is missing.
- (c) The 3-act structure, and the inciting incident is missing.
- (d) None — the book doesn't follow any structure.

*Explanation:* The shape (Call → Tests → Ordeal → Return) is the hero's journey. What that pattern *promises* is transformation. If the protagonist hasn't changed, the pattern's payoff has been broken even though the pattern's beats are present. (b), (c), and (d) describe different problems.

**Q4.** A writer planning a quiet literary novel about an aging professor remembering his marriage chooses to apply a 15-beat commercial beat sheet to plot it. Three months in, the draft feels mechanical. What does Lesson 4 say is most likely happening?
- (a) The writer needs more beats — 15 isn't enough for a novel.
- (b) Beat sheets only work for screenwriting; the writer should use the hero's journey instead.
- (c) The story's engine is interiority and prose, not pacing — and the beat sheet is forcing inserted joints the story doesn't have to give. ✓
- (d) The writer is not skilled enough at beat-sheet writing yet.

*Explanation:* (a), (b), and (d) all suggest a different *technique* will fix it. Lesson 4's point is that some stories don't want any granular structural map; their engine is interiority. Forcing a beat sheet onto a prose-engine novel produces exactly the "mechanical" feeling the writer is reporting. The fix is to step away from the tool, not to apply it harder.

**Q5.** Looking at your own 100-word premise (from Module 1), you ask which structure it wants. The premise centers on: a young woman, raised in isolation, who discovers her mother's letters and decides whether to leave home and find the family she was hidden from. Which structure is most likely the right starting lens, and why?
- (a) Beat sheets — the premise is about a clear external event (the discovery of letters), and beat sheets handle external events well.
- (b) The hero's journey — the engine is transformation (a young woman becoming someone capable of leaving), and the Call/Refusal/Tests/Return pattern matches the implied arc. ✓
- (c) None — the premise is too literary for any structural lens.
- (d) The 3-act structure — the premise has an inciting incident and a clear lock-in, which is enough.

*Explanation:* The premise has a clear protagonist with a transformation arc (isolation → agency). The hero's journey will tell the writer *why* each beat matters in a way the 3-act lens can't, because the deepest question the story is asking is "who does she have to become to leave?" — that's a transformation question. (a) misreads the engine; the external events serve the change, not the other way around. (c) overstates the literariness of a story with a strong external decision. (d) is *true but less informative* — most stories have 3-act underneath, but the hero's journey is the lens that explains *this* premise's specific gravity.

---

## Phase B plan (after your approval)

In one combined commit per your spec:

1. **Migrations (apply first to surface any drift):**
   - `seed-course.ts` — rename the L3 catalog entry; add `applyLessonRenames()` pass.
   - `sitemap.xml` — rename the L3 entry.
   - `foundation-three-ingredients.md` — replace the "Save the Cat" line with "Beat sheets…".

2. **Write the 4 markdown files** under `lib/db/content/architecture/`.

3. **Add the 5 quiz questions** to `QUIZ_BANKS` in `seed-course.ts` keyed by `architecture` slug.

4. **Run `pnpm seed:course`**:
   - First run: applies the rename, updates 5 lessons (4 architecture + the 1 foundation L4 callback edit), inserts 5 questions.
   - Second run: idempotency check — all unchanged, bank skipped, rename no-op.

5. **Smoke-test:**
   - `GET /api/course/lessons/architecture-three-acts` (live content)
   - `GET /api/course/lessons/architecture-beat-sheets` — confirms the rename took effect (old slug returns 404)
   - L4 → next resolves to `characters-protagonist-wound` (Module 3 first lesson)
   - Module 1 L4 endpoint shows the updated "Beat sheets…" line

Single commit, `--no-ff` merge to master, push, delete branch.

Awaiting your sign-off on Phase A before any lesson writing.
