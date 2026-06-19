# "Voices" — a stories feature for famous writers

A new section in Plotzy that publishes short, well-researched
profiles of the world's most influential writers, Arabic and
international, mixing original prose with public-domain photos and
embedded videos. Bundled entirely in the code, no DB rows, no API
quota.

Working name in this plan: **Voices**. Final name to be picked by
Fares before launch.

---

## Part 1, The honest IP rules

Before any line of code, three rules we must follow so the feature
never gets the platform taken down:

### Rule 1, Original prose, not copied

Every paragraph of every profile must be **written from scratch by us
(me) based on widely known biographical facts**. We do not paste
Wikipedia paragraphs, even though Wikipedia is freely licensed. We do
not paste excerpts from biographies, news articles, or interviews.

What we can safely include:
- Birth / death dates and places (public facts).
- Major works (book titles are facts, not copyrighted text).
- Movements and awards (Nobel laureate, etc.).
- Themes the writer is famous for (we describe them in our own words).
- Famous quotes — **only those clearly in the public domain** (pre
  1928 in the US, generally for deceased writers).

What we cannot include:
- Direct copy of any biography text.
- Full poems / short stories under copyright.
- Modern interview quotes (newspapers retain rights).
- Photographs scraped from Google.

### Rule 2, Photographs from free sources only

The single best source: **Wikimedia Commons**. Most pre-1950 writers
have multiple free photographs there. A typical photo's licence is
"public domain" or "CC BY-SA" with a known photographer credited.

For each photo we include, we record:
- The Commons file URL we downloaded from.
- The licence (PD-old, CC BY-SA, CC0, etc.).
- The photographer / source name when required by the licence.

These three fields go in a small caption under every photo, plus a
project-wide credits page (`/credits`).

For living writers, photos are harder. Options:
- A Commons photo released by the writer themselves (e.g. Margaret
  Atwood's profile photos).
- A press photo where the publisher's site explicitly allows
  editorial use.
- Skip photos for that writer and use a stylised silhouette mark
  drawn by us.

### Rule 3, Videos via YouTube embed, not download

YouTube's official `<iframe>` embed is **designed and licensed for
exactly this kind of use**. Embedding does not download, does not
host, and does not strip ads. The video remains under YouTube's terms
and the uploader keeps every right.

We will only embed videos from:
- The author's official channel.
- The publisher's official channel (Penguin, FSG, Knopf, Dar al
  Shorouk, Dar al Adab, etc.).
- TED, Charlie Rose's official archive, BBC's verified channels.
- Documentary archives (PBS, ARTE) when present on YouTube.

We will NOT embed pirated uploads of audiobooks, full films, or
copyrighted interviews someone re-uploaded without rights.

---

## Part 2, The data we can pull from (all free, all legal)

### Wikimedia Commons (the photo source)

URL pattern:
```
https://commons.wikimedia.org/wiki/Category:Ernest_Hemingway
```

We pick a photo, check the licence on its file page, download the
JPG, save it to `public/voices/ernest-hemingway/portrait.jpg`, and
record the source + licence in our metadata file.

Useful Commons categories already populated for many writers:
- `Category:Naguib_Mahfouz`
- `Category:Mahmoud_Darwish`
- `Category:Khalil_Gibran`
- `Category:Ernest_Hemingway`
- `Category:Virginia_Woolf`
- `Category:Franz_Kafka`
- (dozens more)

### Wikipedia (for fact-checking, not text copying)

We read the Wikipedia article to confirm dates and facts, then write
our own profile from scratch. The Wikipedia article is the
fact-checker, not the source paragraph.

### Open Library (book metadata)

Free public API at `openlibrary.org/api`. Lets us fetch:
- Book covers (most pre-1950 covers are public domain).
- Publication dates.
- Edition lists.

Useful for the "Major works" sidebar inside each profile.

### YouTube (for embedded videos)

We embed via the standard `<iframe>` URL pattern:
```
https://www.youtube.com/embed/{VIDEO_ID}
```

We hand-pick 1 to 3 videos per writer from the trusted channels list
above and store only the video ID in our metadata.

### Internet Archive (for additional photos and audio)

Has public domain audio recordings of many writers reading their own
work (e.g. Hemingway reading from "For Whom the Bell Tolls"). These
are linkable and embeddable.

---

## Part 3, How the feature works

### Navigation

A new top-level link in the Plotzy navbar between "Community" and
"Course":

```
... My Library | Tutorial | Guide | Course | Voices | Marketplace ...
```

### Pages

```
/voices                  — the listing page (grid of writer cards)
/voices/:slug            — one writer's profile
/voices/credits          — single project-wide credits page
```

### Listing page (`/voices`)

A hero, then a filterable grid:

- Filter chips: **All**, **Arabic**, **English**, **Spanish**,
  **Russian**, **French**, etc. (one chip per language we cover)
- Sort: **A to Z**, **Birth date**, **Newest profile**
- Each card: portrait photo, name, dates, language tag,
  one-line tagline ("The voice of modern Cairo")

### Profile page (`/voices/:slug`)

A long-read editorial layout, three columns becoming one on phones:

```
┌──────────────────────────────────────────────────────────────┐
│              [ hero portrait, full width, 16:9 ]             │
│                                                              │
│      Naguib Mahfouz                                          │
│      1911 to 2006 · Egyptian · Nobel Prize 1988              │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│   THE STORY                              MAJOR WORKS         │
│   ──────────                            ──────────           │
│   [our original 3 to 5 paragraph        - Children of the    │
│    profile, ~700 words, bilingual]        Alley (1959)       │
│                                         - Cairo Trilogy      │
│                                           (1956-1957)        │
│                                         - Midaq Alley (1947) │
│                                         ...                  │
│                                                              │
│   ON FILM                                                    │
│   ────────                                                   │
│   [YouTube embed: Nobel acceptance        SOURCES & CREDITS  │
│    speech, 1988]                          ──────────         │
│                                          Portrait by         │
│                                          Hisham Tawfeek      │
│   [YouTube embed: documentary             via Wikimedia      │
│    short, 5 minutes]                     Commons, CC BY-SA   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

Each profile contains:

1. Hero photo (Commons, public domain or CC).
2. Name + dates + nationality + signature awards.
3. Original 3 to 5 paragraph profile in EN + AR.
4. Major works list (book titles + years, max 8).
5. One or two famous quotes if confidently public domain.
6. 1 to 3 YouTube embeds from trusted channels.
7. Cross-links to other profiles ("If you like X, read Y").
8. Visible "Sources and credits" block.

---

## Part 4, Data model (zero DB, all in code)

A single TypeScript file `src/data/voices.ts` exports the array:

```typescript
interface VoiceProfile {
  slug: string;                   // "naguib-mahfouz"
  name: { en: string; ar: string };
  bornYear: number;               // 1911
  diedYear?: number;              // 2006
  nationality: { en: string; ar: string };
  language: "ar" | "en" | "es" | "ru" | "fr" | "de" | "ja";
  awards?: string[];              // ["Nobel Prize 1988"]
  tagline: { en: string; ar: string };

  // The original profile prose, written by us. ~600 to 900 words each.
  body: {
    en: string;
    ar: string;
  };

  // Major works, plain facts.
  works: { title: string; year?: number }[];

  // Quotes confidently in the public domain (deceased pre-1928 US, etc.)
  quotes?: { text: string; lang: "en" | "ar" }[];

  // Hero photo from Wikimedia Commons or similar free source.
  photo: {
    src: string;        // "/voices/naguib-mahfouz/portrait.jpg"
    alt: { en: string; ar: string };
    credit: string;     // "Photo: Hisham Tawfeek, via Wikimedia Commons"
    license: string;    // "CC BY-SA 4.0"
    sourceUrl: string;  // "https://commons.wikimedia.org/wiki/File:..."
  };

  // YouTube embeds.
  videos?: {
    youtubeId: string;
    title: { en: string; ar: string };
    channel: string;    // "Nobel Prize Channel"
    note?: { en: string; ar: string };
  }[];

  // Cross-links: which other voices to suggest at the bottom.
  relatedSlugs?: string[];
}

export const VOICES: VoiceProfile[] = [/* ... */];
```

Photos live at `public/voices/{slug}/portrait.jpg`. Vercel serves
them directly, zero DB cost.

---

## Part 5, The first 24 voices (a balanced launch set)

**Arabic, 12 voices** (mix of deceased + selected living with safe
photo options):

1. Naguib Mahfouz, Egyptian Nobel laureate
2. Mahmoud Darwish, Palestinian poet
3. Taha Hussein, Egyptian essayist
4. Khalil Gibran, Lebanese-American poet
5. Nizar Qabbani, Syrian poet
6. Ghassan Kanafani, Palestinian novelist
7. Tayeb Salih, Sudanese novelist
8. Adonis, Syrian poet
9. Elias Khoury, Lebanese novelist
10. Nawal El Saadawi, Egyptian writer
11. Hanan al-Shaykh, Lebanese novelist
12. Abbas Mahmoud al-Aqqad, Egyptian thinker

**International, 12 voices**:

1. Ernest Hemingway, American
2. Virginia Woolf, English
3. Franz Kafka, Czech-German
4. Leo Tolstoy, Russian
5. Fyodor Dostoyevsky, Russian
6. George Orwell, English
7. Jorge Luis Borges, Argentine
8. Gabriel García Márquez, Colombian
9. Agatha Christie, English
10. Jane Austen, English
11. Marcel Proust, French
12. Haruki Murakami, Japanese (living, uses self-published portrait)

Future batches can add: Toni Morrison, Chinua Achebe, Italo Calvino,
Albert Camus, Mishima, Tanizaki, Iris Murdoch, Saul Bellow, Doris
Lessing, V.S. Naipaul, Olga Tokarczuk, and more.

---

## Part 6, What I will write for each profile

The 600 to 900 word original profile is the most labour-intensive
piece. To keep voice consistent and avoid plagiarism, I will write
each one using this template (you'll see the structure in every
profile, the content varies):

- **Paragraph 1, the entry**. Who they are, why they matter in a
  single line. Born in X in Y, died in Z. The image their name should
  raise in a reader's mind.
- **Paragraph 2, the world**. The political and literary climate
  that shaped them. Original analysis, not biographical paraphrase.
- **Paragraph 3, the work**. The major themes across their books, in
  our own words. Specific examples (which book, what idea).
- **Paragraph 4, the legacy**. What writers today owe them. Concrete
  influence on later writers, named.
- **Paragraph 5, the closing image**. A single specific scene or
  detail that captures the writer in one sentence. Memorable.

Every profile is written twice, EN and AR, by hand. The AR version
is not a translation of the EN; it is its own piece written for the
Arabic reader (different cultural references, different rhythm).

Estimated effort: 30 to 45 minutes per profile. 24 profiles = 12 to
18 hours of writing. I will draft them in batches of 4, you review
each batch, we move on.

---

## Part 7, Implementation phases

### Phase A, scaffolding (4 to 6 hours of code work)

1. New page `/voices` in App.tsx route table.
2. Listing component with the filter chips and the card grid.
3. Profile page component with the editorial layout.
4. Cross-link "Related voices" component.
5. `/voices/credits` aggregator page.
6. Navbar entry.
7. i18n: ~30 new keys.

### Phase B, the data file + photos (1 day of curation)

1. For each of the 24 voices, find a free photo on Commons.
2. Download to `public/voices/{slug}/portrait.jpg`.
3. Verify the licence and record it.
4. Pick 1 to 3 YouTube embeds from the trusted-channels list.
5. Skeleton entries in `src/data/voices.ts` with everything except
   the long prose.

### Phase C, the original prose (12 to 18 hours of writing)

Write the 24 EN + 24 AR profiles. Ship in batches of 4 so you can
review and we can adjust the voice as we go.

### Phase D, polish + launch

- Accessibility audit (alt text on every photo, captioned videos).
- Mobile QA.
- SEO meta tags per profile.
- Featured profile on the home page if you want.

Total: **3 to 5 days of focused work**. Less if Phases A and B run in
parallel.

---

## Part 8, What this gets us

### For readers
- An editorial reason to come back to Plotzy when they are not
  actively writing.
- Discovery of writers they may not have heard of (Tayeb Salih,
  Elias Khoury) at the same depth as Hemingway.
- A bilingual literary education without leaving the platform.

### For Plotzy as a brand
- Establishes Plotzy as a place that takes literature seriously,
  not just a tool that ships an AI sidebar.
- An SEO play: profiles for famous writers earn traffic from Google
  searches like "naguib mahfouz biography".
- A natural place to surface the writer's books in the Plotzy
  Library when they are public domain (Mahfouz Trilogy, etc.).

### Costs

- **Database:** zero. All in code.
- **Storage:** ~50 MB of optimised JPGs in Vercel public/. Within
  the Hobby free tier.
- **Bandwidth:** YouTube hosts the videos, we ship a few photos.
  Vercel free.
- **APIs:** none at runtime. All data is static.
- **Subscriptions:** none.

---

## Part 9, What I need from you before I start

Reply with:

1. **"approved"** to start Phase A + B in parallel.
2. Or **"approved with changes"** + your changes.

Optional, you can also tell me:
- A different launch number (12 voices? 36?).
- A different name for the section ("Voices" vs "Authors" vs
  "Library of Lives" vs whatever else).
- Whether you want the navbar entry visible immediately or hidden
  behind a `?preview=voices` flag until the first 12 are ready.

If you say "approved" with no other changes, I will:

1. Build Phase A scaffolding tonight (commit + push).
2. Tomorrow start Phase B (curate photos and YouTube IDs for the
   first 4 voices: Mahfouz, Darwish, Hemingway, Woolf).
3. Draft those 4 profiles end of day, you review, we iterate.
4. Repeat for the remaining 20 in batches of 4 over a week.

The whole feature ships in 4 to 5 calendar days.
