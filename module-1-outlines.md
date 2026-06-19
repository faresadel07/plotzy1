# Module 1: Foundation — Content Outlines

**Batch:** 2.1 · **Branch:** `feat/course-batch-2-1-module-foundation` · **Master tip:** `9153ee0`
**Module slug:** `foundation` · **4 lessons, ~5,400–7,600 words total**

---

## Sourcing & voice ground rules

These apply to all 4 lessons.

- **Public domain only.** Every named work, every quoted line, every author reference must be pre-1928 US public-domain. Modern (post-1928) writing books, courses, or papers are off-limits even paraphrased. When a useful idea comes from modern research (e.g. narrative transportation, fiction-as-social-simulator), describe the *phenomenon* in plain language without citing the source — the user should learn the concept, not the citation.
- **Voice:** conversational but precise — a smart friend who has actually read a lot. Direct address ("you"). Short paragraphs (3–5 sentences average). One key idea per paragraph.
- **No modern-author name-dropping.** Avoids licensing complexity and dates the content. Pre-1928 authors only.
- **Plotzy mentions only when natural.** No "open the Plotzy editor and try this" CTAs. "Open whatever you write in" works.
- **Lesson endings.** Every lesson closes with the writing exercise(s) under a `## Try it` heading. The exercise is the payoff — set it up well in the body so the prompt feels earned.
- **Internal links.** Each lesson can `[link](/learn/lesson/<slug>)` to its neighbours where it strengthens the point. Markdown component handles wouter SPA navigation.
- **No code samples.** Module 1 is pure prose. No syntax-highlight need (matches discovered-issues note).

---

## Cross-lesson arc

The 4 lessons build a thesis cumulatively:

| Lesson | Question it answers | Sets up |
|---|---|---|
| 1. What is a story? | "What am I actually making?" | Defines the object of study |
| 2. Why people read fiction | "Why does anyone want this?" | Locates the reader's hunger you'll feed |
| 3. Finding your story idea | "What do I write about?" | Generates raw material |
| 4. The 3 ingredients | "What does that idea need to become a story?" | Tests the raw material — bridges to Module 2 (Architecture) |

By the end, the student has: a working definition of "story", a felt understanding of why readers read, a 100-word premise of their own, and a way to check whether that premise has the three things every story needs. That's the foundation Module 2 builds structure on top of.

**Callbacks to plan:**
- L2 references L1's definition once ("we said a story is X — that matters here because…")
- L3 references L2 once when discussing what makes an idea pull a reader in
- L4 references L1 (definition), L2 (reader payoff), L3 (the premise the student wrote)

---

## Lesson 1: What is a story? (psychology of narrative)

**Slug:** `foundation-what-is-story` · **Length target:** 1,200–1,800 words

### Thesis
A story is not the same as a plot, an anecdote, or a sequence of events. A story is a *patterned* sequence — someone wants something, hits an obstacle, and is changed by what happens. Human brains are unusually good at remembering narratives in this shape and unusually bad at remembering bare facts. That's not a coincidence; that's why storytelling matters.

### Section structure

1. **The definition (sharp)** — *~250 words*
   - Open with three short sequences:
     - "She woke up. She made coffee. She went to work." (sequence, not story)
     - "She wanted the promotion. Her boss gave it to someone else. She quit and started her own firm." (story — 18 words)
     - "Yesterday I dropped my phone." (anecdote — small, but has all the parts)
   - The difference: *desire + obstacle + change*. The first sequence has none. The second has all three. The third has them in miniature.
   - Cite Aristotle here once: a story has a beginning, middle, and end — but a beginning is not the first thing that happens, it's the thing that makes everything else necessary. (*Poetics*, 7.) That's the difference between sequence and story.

2. **Why brains crave it** — *~300 words*
   - Plain-language description of the phenomenon: when a reader is absorbed in a story, the brain processes the events almost as if they were happening to the reader — emotions, mental imagery, even time-distortion. (Don't cite Green & Brock 2000 — describe.)
   - Evolutionary frame: long before writing, our ancestors transmitted survival information as stories, not lists. "Don't go past the rocks because there's a snake" is forgettable. "Last spring, Tomas went past the rocks and never came back" is unforgettable. Stories are sticky.
   - This isn't decoration — it's why prose works at all. When you write, you're not transferring data; you're triggering simulation in another mind.

3. **Story vs. plot vs. anecdote** — *~300 words*
   - **Plot:** the sequence of events. ("The king died, then the queen died.")
   - **Story:** the causal-emotional structure. ("The king died, and then the queen died of grief.")
     - This distinction is canonical in narrative theory — older than Forster's 1927 framing of it. Use the example, not the citation.
   - **Anecdote:** a small story. Has the parts but not the scale.
   - **Vignette:** a moment, no change.
   - Why this matters: students often write extended *anecdotes* and call them stories. Knowing the difference is the first technical move.

4. **Stories as meaning-making** — *~250 words*
   - We don't just remember stories; we use them to *interpret* what's happened to us. A breakup is data. A breakup-as-story has a turning point, a reckoning, a lesson — even when the reality didn't.
   - Two implications for writers:
     - The reader will impose pattern on whatever you give them. Your job is to make sure the pattern they find is the one you meant.
     - The reader is hungry for meaning, not events. A 20-page chapter where nothing means anything will feel longer than a 5-page chapter that lands a reckoning.

5. **What this gives you** — *~150 words*
   - Working definition: a story is a patterned sequence in which someone wants something, hits an obstacle, and is changed.
   - You'll spend the next 26 lessons learning to put that pattern in place on purpose.

### Public-domain anchors
- Aristotle, *Poetics* (~335 BCE) — the beginning/middle/end definition; the idea that a beginning is the thing that makes the rest necessary.
- *The Iliad* (Homer) — referenced once if needed for the wrath-as-engine example.

### Try it (writing exercises)

> **Exercise 1.1 — The 200-word change.** Pick a real or imagined moment when someone's mind changed about something. Write 200 words *only* about that moment. Skip the lead-up; skip the aftermath. The mind changing is the whole story.

> **Exercise 1.2 — The three sticky stories.** Write down three stories that have stuck with you — books, films, family stories, anything. Beside each, write one sentence: "Someone wanted X, and the obstacle was Y, and they ended up Z." If you can't fill in the sentence, that "story" might actually be a vignette or an anecdote. That's useful information.

---

## Lesson 2: Why people read fiction

**Slug:** `foundation-why-people-read` · **Length target:** 1,200–1,800 words

### Thesis
Readers don't open novels because they want a sequence of events. They open novels because fiction does something arguments and self-help books cannot do: it lets them *practice being someone else*. Knowing the specific hungers fiction feeds tells you what to put on the page.

### Section structure

1. **The wrong answer** — *~200 words*
   - The conventional answer is "escapism" — readers read to leave their lives. That's true sometimes and incomplete always. People who only want to escape go to sleep, scroll their phone, drink. They don't sit silently with a book for three hours.
   - Whatever fiction does, it's stronger than escape.

2. **The empathy machine** — *~350 words*
   - Plain-language framing: when you read a well-rendered character, your brain runs that character's choices on its own simulator. You feel what they would feel. By the time you put the book down, you've practiced being someone you've never been.
   - This is why a reader who has never lost a child can be wrecked by a novel about losing a child — the book gave them rehearsal in an emotion they hadn't lived.
   - For the writer: a character in pain is not enough. The reader has to be set up to *feel* the pain, not be told about it. (Forward-flag: this becomes "show, don't tell" in Module 4.)

3. **The social simulator** — *~300 words*
   - Describe the concept (not the citation): fiction is a low-stakes way to learn social rules. How does a 19th-century Russian aristocrat handle being snubbed? How does a sea captain decide whether to kill the only thing he's ever been obsessed with? You can read 50 lives in a year.
   - Implication: readers will tolerate slow patches in a story if those patches teach them something about *how a person works*. They will not tolerate slow patches that teach them nothing.

4. **Why genres exist** — *~300 words*
   - Each genre answers a specific psychological hunger:
     - **Mystery** — the world is illegible; I want it to make sense by the last page.
     - **Romance** — I want to believe two people can recognise each other.
     - **Horror** — I want to feel something I keep at bay in daily life and survive it.
     - **Tragedy** — I want to confirm that some losses are real and worth grieving.
   - When you understand which hunger your reader brought to your book, you understand what *not* to skip.

5. **The reader is your collaborator** — *~200 words*
   - Callback: in Lesson 1 we said the reader imposes pattern on whatever you give them. Here's the practical version — the reader is *trying* to find meaning in your sentences. They're rooting for you. Your job isn't to convince a hostile audience; your job is to not break the trust of someone who showed up wanting it to work.

### Public-domain anchors
- One Tolstoy mention is fine (*Anna Karenina*, 1877) — the snubbing example is from a famous early scene.
- One Melville reference (*Moby-Dick*, 1851) — the captain-and-obsession example.
- Avoid genre book citations; the genres themselves are the example.

### Try it

> **Exercise 2.1 — The book that argued.** Pick a book that changed your view on something — a relationship, a place, a kind of person. In 250 words, describe what the book did that an argument couldn't. Be specific: what was the moment it landed?

---

## Lesson 3: Finding your story idea

**Slug:** `foundation-finding-idea` · **Length target:** 1,500–2,000 words

### Thesis
Most beginners think the hard part is *getting* the idea. The hard part is recognising which of your ideas can actually carry a book. This lesson teaches you to generate raw ideas in volume, then sort them by carrying capacity.

### Section structure

1. **You don't need an "original" idea** — *~250 words*
   - Originality at the *idea* level is overrated. Pride and Prejudice is "two stubborn people misjudge each other" — there are 10,000 stories with that idea. What's original is the execution.
   - Stop waiting for the lightning bolt. Lightning never strikes the prepared. The prepared write down ten "what ifs" a day.

2. **The "what if" question** — *~300 words*
   - Frame: every story you've ever loved was, at some point, a "what if?". *Frankenstein* (Shelley, 1818) was "what if a man tried to create life and succeeded?" *The Time Machine* (Wells, 1895) was "what if you could go forward and see what we became?"
   - "What if" is good because it forces a *change* into the premise. ("A man builds a robot" is flat. "What if a man built a robot and it asked to leave?" is a story.)
   - Practical exercise (full version in the Try it section): 10 what-ifs in 15 minutes, no editing.

3. **Mining your obsessions** — *~300 words*
   - The questions you can't stop asking are gold. The arguments you've had three times. The kind of person you can't stop watching. The injustice that still pisses you off.
   - These come bundled with motivation. Most novels die at month three because the writer doesn't actually care about the question they're answering. You can't fake-care for 80,000 words.

4. **The intersection method** — *~300 words*
   - Take two unrelated interests of yours. Smash them together. Examples (clearly hypothetical):
     - Beekeeping + grief → a widow inherits her husband's hives and learns she didn't know him.
     - Maps + lying → a 19th-century cartographer redraws a border for money.
   - The intersection method works because it forces specificity. "A novel about grief" is dust. "A novel about a widow and her husband's bees" has a place to start.

5. **Ideas vs. premises** — *~300 words*
   - **Idea:** a kernel ("a man builds a robot").
   - **Premise:** the kernel + character + situation + tension. ("A grieving engineer builds a robot to keep his dead daughter company; the robot starts to ask why she's never coming back.")
   - You can't write from an idea. You can write from a premise. The translation step is the work of this lesson.

6. **When ideas are too small or too big** — *~250 words*
   - Too small: "A woman gets stuck in traffic." (Anecdote sized — see Lesson 1.) Make it bigger by giving her something at stake at the destination.
   - Too big: "The history of a nation across 200 years." (Epic-sized; will defeat you for a first book.) Make it smaller by anchoring on one family or one decade.
   - Right-sized for a first book: one major character, one major question, 6–24 months of fictional time. Most great novels live there.

### Public-domain anchors
- *Frankenstein* (Shelley, 1818) — the "what if?" example.
- *The Time Machine* (Wells, 1895) — second example.
- *Pride and Prejudice* (Austen, 1813) — for "original at the execution level".

### Try it

> **Exercise 3.1 — Ten what-ifs in fifteen minutes.** Set a timer. Write ten "what if?" questions. No editing. No filtering. Some will be embarrassing; some will be derivative; some will be small. None of that matters. The point is volume — you cannot select for quality without quantity to choose from.

> **Exercise 3.2 — The 100-word premise.** Look at your ten what-ifs. Pick the one you'd most like to read. In exactly 100 words, expand it into a premise: who's the central character, what do they want, what's in the way, what's the central question? You'll bring this premise into Lesson 4 and the rest of the course.

---

## Lesson 4: The 3 ingredients every story needs

**Slug:** `foundation-three-ingredients` · **Length target:** 1,500–2,000 words

### Thesis
Test any premise — including the one you just wrote — against three questions: Is there a character we care about? Is there a conflict that won't go away? Is there a change by the end? If any answer is "no", the premise isn't yet a story.

### Section structure

1. **The three, briefly** — *~150 words*
   - **Character** — someone we care about, not just observe.
   - **Conflict** — they want something, and something is in the way.
   - **Change** — by the end, they're not who they were at the start.
   - These are non-negotiable. Removing any one breaks the story. The next four sections show why.

2. **Character: care vs. interest** — *~350 words*
   - "Care" doesn't mean "like". Macbeth is not likeable. Captain Ahab is not likeable. We care about both because we *understand* what they want and we recognise the wanting.
   - The fastest way to make a character cared-about: give them a *want* a reader can feel themselves wanting. Even if we'd never share Ahab's want for the white whale, we recognise the shape of an obsession that ate everything else.
   - The slowest way: tell us they're "kind" or "brave". Adjectives don't earn care; behaviour does.
   - Example: Elizabeth Bennet (Austen, 1813) — we care because she's wrong about Darcy and we can feel why she'd be. Her want isn't "find a husband"; it's "be seen accurately." That's a want a 21st-century reader still feels.

3. **Conflict: want + obstacle** — *~350 words*
   - A conflict is not "things go badly." A conflict is *a specific want meeting a specific obstacle*.
   - The obstacle can be:
     - Another person (Darcy and his pride; Iago and his envy)
     - A circumstance (the war in *War and Peace*, 1869; the sea in *Moby-Dick*)
     - The character's own self (Ebenezer Scrooge's miserliness in *A Christmas Carol*, 1843)
   - Strong premises usually have at least two of these stacked. Pride and Prejudice runs on Darcy AND Elizabeth's own pride at once.
   - If your premise has a want without a clear obstacle, you don't have a conflict — you have a wish. Wishes don't drive 80,000 words.

4. **Change: who they were vs. who they become** — *~350 words*
   - The change can be:
     - Internal (Scrooge: from miser to giver)
     - External (someone wins a thing they couldn't win at the start)
     - Tragic (someone learns a truth too late — Achilles realises in the *Iliad* that he wanted Patroclus more than glory)
   - The reader's payoff comes at the change. The 79,999 words before that exist to *earn* it. A story with no change is a complaint.
   - A common beginner mistake: change the situation but not the character. The protagonist solves the murder but is exactly who they were on page 1. Readers feel cheated even when they can't articulate why.

5. **Testing your premise** — *~250 words*
   - Pull out the 100-word premise from Lesson 3. Three questions:
     - Who is the character — and is their *want* something a reader can feel?
     - What is the *specific* obstacle — internal, external, or both?
     - What change is implied by the end — and would a reader feel it landed?
   - If any question is hard to answer, that's information. The premise isn't broken; it's *unfinished*. You now know what to develop next.

6. **What's next** — *~150 words*
   - Module 2 builds *structure* — the architecture that lets these three ingredients pay off across hundreds of pages. But you have the ingredients. That's enough to start.

### Public-domain anchors
- Pride and Prejudice (Austen, 1813), Moby-Dick (Melville, 1851), War and Peace (Tolstoy, 1869), A Christmas Carol (Dickens, 1843), The Iliad (Homer), Othello (Shakespeare, ~1603) — used sparingly, in passing, never quoted.

### Try it

> **Exercise 4.1 — The premise test.** Take the 100-word premise you wrote in Lesson 3 (Exercise 3.2). Without changing it, write three short answers underneath:
> - **Character:** in one sentence, what does the protagonist want? Is it something the reader can feel themselves wanting?
> - **Conflict:** in one sentence, what is the specific obstacle? Is it another person, a circumstance, the protagonist's own nature, or some combination?
> - **Change:** in one sentence, who is the protagonist at the end that they weren't at the start?
>
> If any of the three sentences is hard to write, the premise has a hole. That's good news — you now know which hole to fill before you start drafting.

---

## Module 1 quiz preview (5 questions, 70% to pass)

These questions test understanding, not memorisation. Each has 4 options, one correct answer, and a brief explanation surfaced after the user submits (per Batch 1.2 contract).

**Q1.** Which of the following is closest to the definition of "story" given in Lesson 1?
- (a) A sequence of events presented in chronological order.
- (b) A patterned sequence in which someone wants something, hits an obstacle, and is changed by what happens. ✓
- (c) A description of a memorable moment from a person's life.
- (d) A made-up version of real events designed to entertain.

*Explanation:* a story isn't defined by being chronological (a) or memorable (c) or fictional (d) — it's defined by the *pattern* of want, obstacle, and change.

**Q2.** Lesson 2 argues that fiction does something arguments and non-fiction can't. Which best captures that thing?
- (a) Fiction is more entertaining than non-fiction.
- (b) Fiction is easier to remember than non-fiction.
- (c) Fiction lets a reader practice being someone else by simulating their choices and emotions. ✓
- (d) Fiction reaches a wider audience because it doesn't require expertise.

*Explanation:* (a), (b), and (d) may be true incidentally, but the unique thing fiction does is provide *rehearsal* in another life — that's what an argument can never do.

**Q3.** A student tells you their idea is "a man builds a robot." What's the most useful next move?
- (a) Tell them the idea is too unoriginal to use.
- (b) Tell them to expand it into a premise that adds character, situation, and tension. ✓
- (c) Tell them to find a less common idea.
- (d) Tell them robots are overdone.

*Explanation:* originality lives in execution, not in the idea (Lesson 3). The fix isn't a different idea — it's translating *this* idea into a premise that has someone with a want and an obstacle.

**Q4.** Which premise contains all three ingredients required for a story (character to care about, conflict, change)?
- (a) A widow inherits her husband's beehives.
- (b) A widow inherits her husband's beehives, learns he kept them as a refuge from a marriage he was secretly leaving, and decides whether to forgive a dead man. ✓
- (c) A widow has hives in her backyard and writes about them in her journal.
- (d) A widow remembers when her husband first showed her the hives.

*Explanation:* (a) is an idea, not yet a premise — no obstacle, no change. (c) is a vignette. (d) is a memory. Only (b) has a character with a felt want, a specific obstacle (the discovery), and an implied change (the decision to forgive or not).

**Q5.** A novel ends with the protagonist solving a murder but being exactly the same person they were on page one. According to Lesson 4, what is most likely missing?
- (a) The character isn't likeable enough.
- (b) The conflict wasn't dramatic enough.
- (c) The change ingredient is absent — the situation changed, but the character didn't. ✓
- (d) The plot was too short.

*Explanation:* (a) is irrelevant — characters don't need to be likeable to be cared-about (Macbeth, Ahab). (b) and (d) describe symptoms, not the underlying issue. The missing ingredient is *change*: the reader's payoff at the end is supposed to be the difference between who-they-were and who-they-become.

---

## Open questions for you before Phase B

1. **Length tolerance.** The targets above are guides per your spec — happy with the implied total of ~5,400–7,600 words for Module 1?
2. **Quiz tone.** Q4 in particular is closer to "applied" than "factual recall" — confirm that's the right register for module quizzes? (Final exam can lean factual; module quizzes feel like the place to test whether the student *understood*.)
3. **Voice sample.** Want me to write Lesson 1 in full first as a voice sample before committing to all four? Or write Lessons 1 + 2 together (since L2 calls back to L1) and you review them as a pair?
4. **Source disclosure.** Phase A spec asked for "Further reading" attribution lists per lesson. I'd recommend keeping them brief (3–5 entries each, public-domain only). Confirm — or do you want them longer?

Awaiting your sign-off on Phase A before any lesson markdown lands.
