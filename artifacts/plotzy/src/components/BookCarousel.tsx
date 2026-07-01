/* ROW1: original Project Gutenberg covers (confirmed working)
   ROW2: Open Library by ISBN, with blank-image detection (OL returns 1×1 gif for missing covers) */

import { Link } from "wouter";

const gutCover = (id: number) =>
  `https://www.gutenberg.org/cache/epub/${id}/pg${id}.cover.medium.jpg`;

const olCover = (isbn: string) =>
  `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`;

const hindawiCover = (id: number) =>
  `https://downloads.hindawi.org/covers/304x406/${id}.jpg`;

/* LibriVox cover — stored on Archive.org via the services/img endpoint,
   keyed by the LibriVox recording's archive.org identifier. */
const librivoxCover = (archiveId: string) =>
  `https://archive.org/services/img/${archiveId}`;

const ROW1 = [
  { title: "Pride and Prejudice",               cover: gutCover(1342) },
  { title: "Moby Dick",                         cover: gutCover(2701) },
  { title: "Alice in Wonderland",               cover: gutCover(11)   },
  { title: "The Picture of Dorian Gray",        cover: gutCover(174)  },
  { title: "Frankenstein",                      cover: gutCover(84)   },
  { title: "Dracula",                           cover: gutCover(345)  },
  { title: "Jane Eyre",                         cover: gutCover(1260) },
  { title: "A Tale of Two Cities",              cover: gutCover(98)   },
  { title: "Adventures of Sherlock Holmes",     cover: gutCover(1661) },
  { title: "Treasure Island",                   cover: gutCover(120)  },
  { title: "Adventures of Tom Sawyer",          cover: gutCover(74)   },
  { title: "Huckleberry Finn",                  cover: gutCover(76)   },
  { title: "Great Expectations",                cover: gutCover(1400) },
  { title: "The War of the Worlds",             cover: gutCover(36)   },
  { title: "Anna Karenina",                     cover: gutCover(1399) },
  { title: "Crime and Punishment",              cover: gutCover(2554) },
  { title: "The Odyssey",                       cover: gutCover(1727) },
  { title: "Oliver Twist",                      cover: gutCover(730)  },
  { title: "Romeo and Juliet",                  cover: gutCover(1513) },
  { title: "Don Quixote",                       cover: gutCover(996)  },
];

const ROW2 = [
  { title: "The Count of Monte Cristo",         cover: olCover("9780140449266") },
  { title: "Wuthering Heights",                 cover: olCover("9780141439556") },
  { title: "Sense and Sensibility",             cover: olCover("9780141439662") },
  { title: "Little Women",                      cover: olCover("9780142408766") },
  { title: "David Copperfield",                 cover: olCover("9780140439441") },
  { title: "The Brothers Karamazov",            cover: olCover("9780140449242") },
  { title: "Middlemarch",                       cover: olCover("9780141439549") },
  { title: "Ulysses",                           cover: olCover("9780141182803") },
  { title: "Emma",                              cover: olCover("9780141439587") },
  { title: "Persuasion",                        cover: olCover("9780141439686") },
  { title: "Mansfield Park",                    cover: olCover("9780141439792") },
  { title: "The Three Musketeers",              cover: olCover("9780140440447") },
  { title: "The Scarlet Letter",                cover: olCover("9780142437261") },
  { title: "Tess of the d'Urbervilles",         cover: olCover("9780141439594") },
  { title: "Far from the Madding Crowd",        cover: olCover("9780140432312") },
];

/* Hindawi Foundation Arabic public-domain covers (CC BY 4.0).
   Cover URL is derived from the Hindawi book id. */
const HROW1 = [
  { title: "لؤلؤة الحب",                cover: hindawiCover(13028368) },
  { title: "مغامرة العميل المرموق",     cover: hindawiCover(13035305) },
  { title: "ثلاثة دروس في ديكارت",      cover: hindawiCover(13050381) },
  { title: "كشف المُخبَّا عن فنون أوربا", cover: hindawiCover(13068491) },
  { title: "حقائق الإسلام وأباطيل خصومه", cover: hindawiCover(13082050) },
  { title: "مدينة زحلة",               cover: hindawiCover(13149739) },
  { title: "لاسلكيًّا",                 cover: hindawiCover(13153615) },
  { title: "الفاروق عمر",              cover: hindawiCover(13538483) },
  { title: "إبراهيم الثاني",            cover: hindawiCover(13572470) },
  { title: "الحجاج بن يوسف",           cover: hindawiCover(13595164) },
  { title: "المسألة السودانية",         cover: hindawiCover(13603829) },
  { title: "غادة كربلاء",              cover: hindawiCover(13604281) },
  { title: "أبيض الناب",               cover: hindawiCover(13639135) },
  { title: "البدوية",                  cover: hindawiCover(13680727) },
  { title: "قصة الأيام القادمة",        cover: hindawiCover(13736816) },
  { title: "ألف ليلة وليلة",            cover: hindawiCover(13815802) },
  { title: "نماذج بشرية",              cover: hindawiCover(13919315) },
];

const HROW2 = [
  { title: "الإسلام والحضارة الإنسانية", cover: hindawiCover(13920718) },
  { title: "رواية الشقيقتين",           cover: hindawiCover(13925094) },
  { title: "فلسفة ابن رشد",            cover: hindawiCover(13939717) },
  { title: "فضيحة في بوهيميا",          cover: hindawiCover(13949592) },
  { title: "صلاح الدين الأيوبي وعصره",  cover: hindawiCover(13950286) },
  { title: "الأوابد",                  cover: hindawiCover(13957902) },
  { title: "صانع الألماس",             cover: hindawiCover(13964931) },
  { title: "الأمومة عند العرب",         cover: hindawiCover(14024730) },
  { title: "بنت قسطنطين",              cover: hindawiCover(14035374) },
  { title: "مغامرة مخططات بروس بارتينجتون", cover: hindawiCover(14042824) },
  { title: "محاضرات عن خليل مطران",      cover: hindawiCover(14136317) },
  { title: "نباتات الزينة العشبية",      cover: hindawiCover(14136905) },
  { title: "شرق وغرب",                 cover: hindawiCover(14159130) },
  { title: "سمسمة",                    cover: hindawiCover(14253527) },
  { title: "الحضارة الإسلامية",         cover: hindawiCover(14602927) },
  { title: "الفاروق عمر",              cover: hindawiCover(13538483) },
  { title: "أنت من فعلها!",            cover: hindawiCover(13649293) },
];

function makeFallback(el: HTMLElement, title: string) {
  if (el.querySelector(".fb-lbl")) return;
  el.style.background = "linear-gradient(135deg,#5b21b6,#1e3a8a)";
  const lbl = document.createElement("div");
  lbl.className = "fb-lbl";
  lbl.style.cssText =
    "position:absolute;inset:0;display:flex;align-items:center;justify-content:center;" +
    "padding:8px;text-align:center;font-size:9.5px;color:rgba(255,255,255,0.88);" +
    "font-family:Georgia,serif;font-style:italic;line-height:1.35;";
  lbl.textContent = title;
  el.appendChild(lbl);
}

function BookCover({ title, cover }: { title: string; cover: string }) {
  return (
    <div className="group/book flex-shrink-0 mx-2.5" style={{ width: 90 }}>
      <div
        className="relative overflow-hidden transition-transform duration-300 group-hover/book:scale-[1.06]"
        style={{
          width: 90,
          height: 135,
          borderRadius: 5,
          boxShadow: "4px 5px 16px rgba(0,0,0,0.24), 1px 1px 4px rgba(0,0,0,0.10)",
          background: "#e5e5e5",
        }}
      >
        <img
          src={cover}
          alt={title}
          loading="eager"
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          onLoad={(e) => {
            const img = e.currentTarget;
            /* Open Library returns a 1×1 transparent gif when no cover exists */
            if (img.naturalWidth <= 1 || img.naturalHeight <= 1) {
              img.style.display = "none";
              const p = img.parentElement;
              if (p) makeFallback(p, title);
            }
          }}
          onError={(e) => {
            const img = e.currentTarget;
            img.style.display = "none";
            const p = img.parentElement;
            if (p) makeFallback(p, title);
          }}
        />
        {/* Spine shadow */}
        <div
          style={{
            position: "absolute", top: 0, left: 0, width: 7, height: "100%",
            background: "linear-gradient(to right,rgba(0,0,0,0.28),transparent)",
            pointerEvents: "none",
          }}
        />
        {/* Hover title */}
        <div
          className="absolute inset-x-0 bottom-0 opacity-0 group-hover/book:opacity-100 transition-opacity duration-200"
          style={{ background: "linear-gradient(to top,rgba(0,0,0,0.85),transparent)", padding: "20px 6px 6px" }}
        >
          <p style={{ fontSize: 8.5, color: "rgba(255,255,255,0.92)", fontFamily: "Georgia,serif", textAlign: "center", lineHeight: 1.3, margin: 0 }}>
            {title}
          </p>
        </div>
      </div>
    </div>
  );
}

function Track({ books, reverse }: { books: { title: string; cover: string }[]; reverse?: boolean }) {
  const doubled = [...books, ...books];
  const animName = reverse ? "bookMarqueeRev" : "bookMarquee";
  return (
    // Force LTR: the marquee (translateX 0 -> -50% over a doubled, max-content
    // flex row) only tiles seamlessly in LTR. When the site language is Arabic
    // the document goes dir=rtl, which otherwise breaks the loop and leaves a
    // large empty gap in every carousel.
    <div dir="ltr" className="group" style={{ overflow: "hidden" }}>
      <div
        style={{ display: "flex", direction: "ltr", width: "max-content", animation: `${animName} 45s linear infinite` }}
        className="group-hover:[animation-play-state:paused]"
      >
        {doubled.map((book, i) => (
          <BookCover key={i} {...book} />
        ))}
      </div>
    </div>
  );
}

export function BookCarousel() {
  return (
    <div
      style={{
        width: "100%",
        overflow: "hidden",
        padding: "36px 0",
        background: "linear-gradient(to bottom, #f8f8f8 0%, #f1f1f1 100%)",
        borderTop: "1px solid rgba(0,0,0,0.05)",
        borderBottom: "1px solid rgba(0,0,0,0.05)",
        position: "relative",
      }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, width: 140, height: "100%", background: "linear-gradient(to right,#f8f8f8,transparent)", zIndex: 2, pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: 0, right: 0, width: 140, height: "100%", background: "linear-gradient(to left,#f1f1f1,transparent)", zIndex: 2, pointerEvents: "none" }} />

      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <Link href="/discover">
          <span style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontSize: 13,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            fontFamily: "-apple-system,'SF Pro Display','SF Pro Text',sans-serif",
            fontWeight: 600,
            color: "#000",
            cursor: "pointer",
            borderBottom: "1.5px solid rgba(0,0,0,0.25)",
            paddingBottom: 2,
            transition: "color 0.2s, border-color 0.2s",
          }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.color = "#333";
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(0,0,0,0.55)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.color = "#000";
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(0,0,0,0.25)";
            }}
          >
            Explore our free classics library: 70,000+ books, read instantly
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </span>
        </Link>
      </div>

      <Track books={ROW1} />
      <div style={{ height: 14 }} />
      <Track books={ROW2} reverse />

      <style>{`
        @keyframes bookMarquee    { from { transform: translateX(0);    } to { transform: translateX(-50%); } }
        @keyframes bookMarqueeRev { from { transform: translateX(-50%); } to { transform: translateX(0);    } }
      `}</style>
    </div>
  );
}

/* Audio Library band — public-domain audiobooks streamed direct from
   LibriVox. Same two-row marquee as the text carousels, but with a
   dark palette so it reads as a distinct "audio" section rather than
   another wall of paper books. Covers are Archive.org identifiers
   resolved once (LibriVox ID -> archive.org identifier). */

const AROW1 = [
  { title: "Pride and Prejudice",         cover: librivoxCover("pride_and_prejudice_librivox") },
  { title: "Adventures of Sherlock Holmes", cover: librivoxCover("adventures_holmes") },
  { title: "A Tale of Two Cities",        cover: librivoxCover("tale_two_cities_librivox") },
  { title: "Alice's Adventures in Wonderland", cover: librivoxCover("alice_in_wonderland_librivox") },
  { title: "The Time Machine",            cover: librivoxCover("time_machine_0805_librivox") },
  { title: "Dracula",                     cover: librivoxCover("dracula_librivox") },
  { title: "Great Expectations",          cover: librivoxCover("great_expectations_mfs_0812_librivox") },
  { title: "Wuthering Heights",           cover: librivoxCover("wuthering_heights_0801_librivox") },
  { title: "Jane Eyre",                   cover: librivoxCover("jane_eyre_librivox") },
  { title: "Treasure Island",             cover: librivoxCover("treasureisland_librivox") },
  { title: "The Odyssey",                 cover: librivoxCover("odyssey_butler_librivox") },
  { title: "The Iliad",                   cover: librivoxCover("illiad_0801_librivox3") },
  { title: "Anne of Green Gables",        cover: librivoxCover("anne_of_green_gables_librivox") },
  { title: "Peter Pan",                   cover: librivoxCover("peter_pan_0707_librivox") },
  { title: "The Wind in the Willows",     cover: librivoxCover("wind_in_the_willows_collab_librivox") },
  { title: "The Secret Garden",           cover: librivoxCover("secret_garden_librivox") },
  { title: "Beowulf",                     cover: librivoxCover("beowulf") },
];

const AROW2 = [
  { title: "The Picture of Dorian Gray",  cover: librivoxCover("dorian_gray_librivox") },
  { title: "Adventures of Tom Sawyer",    cover: librivoxCover("tom_sawyer_librivox") },
  { title: "The Divine Comedy",           cover: librivoxCover("divine_comedy_librivox") },
  { title: "The Aeneid",                  cover: librivoxCover("aeneid_0810_librivox1") },
  { title: "Persuasion",                  cover: librivoxCover("persuasion_0708_librivox") },
  { title: "Sense and Sensibility",       cover: librivoxCover("0_sense_and_sensibility_librivox") },
  { title: "Mansfield Park",              cover: librivoxCover("mansfield_park_librivox") },
  { title: "The Call of the Wild",        cover: librivoxCover("call_of_the_wild") },
  { title: "White Fang",                  cover: librivoxCover("white_fang_librivox") },
  { title: "The Metamorphosis",           cover: librivoxCover("metamorphosis_librivox") },
  { title: "Ethan Frome",                 cover: librivoxCover("ethan_frome_0802_librivox") },
  { title: "The Age of Innocence",        cover: librivoxCover("age_of_innocence_librivox") },
  { title: "The House of Mirth",          cover: librivoxCover("house_mirth_etk_librivox") },
  { title: "Little Women",                cover: librivoxCover("little_women_0711_librivox") },
  { title: "The Wonderful Wizard of Oz",  cover: librivoxCover("wizard_of_oz") },
  { title: "A Study in Scarlet",          cover: librivoxCover("studyinscarlet_0811_librivox") },
  { title: "The Hound of the Baskervilles", cover: librivoxCover("hound_baskervilles_librivox") },
  { title: "The Turn of the Screw",       cover: librivoxCover("turn_screw_librivox") },
  { title: "Bleak House",                 cover: librivoxCover("bleak_house_cl_librivox") },
  { title: "A Christmas Carol",           cover: librivoxCover("A_Christmas_Carol") },
];

export function AudioBookCarousel() {
  return (
    <div
      style={{
        width: "100%",
        overflow: "hidden",
        padding: "44px 0 40px",
        background: "linear-gradient(to bottom, #0a0a0a 0%, #050505 100%)",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        position: "relative",
      }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, width: 140, height: "100%", background: "linear-gradient(to right,#0a0a0a,transparent)", zIndex: 2, pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: 0, right: 0, width: 140, height: "100%", background: "linear-gradient(to left,#050505,transparent)", zIndex: 2, pointerEvents: "none" }} />

      <div style={{ textAlign: "center", marginBottom: 22 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "5px 12px",
            borderRadius: 999,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.10)",
            marginBottom: 12,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
          </svg>
          <span style={{ fontSize: 10.5, fontWeight: 700, color: "rgba(255,255,255,0.7)", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "-apple-system,'SF Pro Display','SF Pro Text',sans-serif" }}>
            Public Domain Audio
          </span>
        </div>
        <div>
          <Link href="/audiolibrary">
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              fontFamily: "-apple-system,'SF Pro Display','SF Pro Text',sans-serif",
              fontWeight: 600,
              color: "#f0efe8",
              cursor: "pointer",
              borderBottom: "1.5px solid rgba(255,255,255,0.28)",
              paddingBottom: 2,
              transition: "color 0.2s, border-color 0.2s",
            }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.color = "#fff";
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.6)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.color = "#f0efe8";
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.28)";
              }}
            >
              Explore our free audio library: 19,000+ audiobooks, listen instantly
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </span>
          </Link>
        </div>
      </div>

      <TrackDark books={AROW1} />
      <div style={{ height: 14 }} />
      <TrackDark books={AROW2} reverse />

      <style>{`
        @keyframes bookMarquee    { from { transform: translateX(0);    } to { transform: translateX(-50%); } }
        @keyframes bookMarqueeRev { from { transform: translateX(-50%); } to { transform: translateX(0);    } }
      `}</style>
    </div>
  );
}

/* Dark-fallback variant of Track/BookCover. Uses the same marquee but
   the placeholder gradient is dark so a missing cover doesn't glow
   against the audiobook section's near-black background. */
function TrackDark({ books, reverse }: { books: { title: string; cover: string }[]; reverse?: boolean }) {
  const doubled = [...books, ...books];
  const animName = reverse ? "bookMarqueeRev" : "bookMarquee";
  return (
    <div dir="ltr" className="group" style={{ overflow: "hidden" }}>
      <div
        style={{ display: "flex", direction: "ltr", width: "max-content", animation: `${animName} 50s linear infinite` }}
        className="group-hover:[animation-play-state:paused]"
      >
        {doubled.map((book, i) => (
          <BookCoverDark key={i} {...book} />
        ))}
      </div>
    </div>
  );
}

function BookCoverDark({ title, cover }: { title: string; cover: string }) {
  return (
    <Link href="/audiolibrary">
      <div className="group/book flex-shrink-0 mx-2.5" style={{ width: 90, cursor: "pointer" }}>
        <div
          className="relative overflow-hidden transition-transform duration-300 group-hover/book:scale-[1.06]"
          style={{
            width: 90,
            height: 135,
            borderRadius: 5,
            boxShadow: "4px 5px 20px rgba(0,0,0,0.55), 1px 1px 5px rgba(0,0,0,0.25)",
            background: "#1a1a1a",
          }}
        >
          <img
            src={cover}
            alt={title}
            loading="eager"
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            onLoad={(e) => {
              const img = e.currentTarget;
              if (img.naturalWidth <= 1 || img.naturalHeight <= 1) {
                img.style.display = "none";
                const p = img.parentElement;
                if (p) makeDarkFallback(p, title);
              }
            }}
            onError={(e) => {
              const img = e.currentTarget;
              img.style.display = "none";
              const p = img.parentElement;
              if (p) makeDarkFallback(p, title);
            }}
          />
          <div
            style={{
              position: "absolute", top: 0, left: 0, width: 7, height: "100%",
              background: "linear-gradient(to right,rgba(0,0,0,0.4),transparent)",
              pointerEvents: "none",
            }}
          />
          <div
            className="absolute inset-x-0 bottom-0 opacity-0 group-hover/book:opacity-100 transition-opacity duration-200"
            style={{ background: "linear-gradient(to top,rgba(0,0,0,0.92),transparent)", padding: "20px 6px 6px" }}
          >
            <p style={{ fontSize: 8.5, color: "rgba(255,255,255,0.95)", fontFamily: "Georgia,serif", textAlign: "center", lineHeight: 1.3, margin: 0 }}>
              {title}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}

function makeDarkFallback(el: HTMLElement, title: string) {
  if (el.querySelector(".fb-lbl")) return;
  el.style.background = "linear-gradient(135deg,#2a1e5b,#0d1b3a)";
  const lbl = document.createElement("div");
  lbl.className = "fb-lbl";
  lbl.style.cssText =
    "position:absolute;inset:0;display:flex;align-items:center;justify-content:center;" +
    "padding:8px;text-align:center;font-size:9.5px;color:rgba(255,255,255,0.88);" +
    "font-family:Georgia,serif;font-style:italic;line-height:1.35;";
  lbl.textContent = title;
  el.appendChild(lbl);
}

/* Arabic public-domain library (Hindawi Foundation, CC BY 4.0). Same
   auto-scrolling two-row marquee as the English carousel above, so the two
   sit together as one continuous "free books" band on the landing page. */
export function ArabicBookCarousel() {
  return (
    <div
      style={{
        width: "100%",
        overflow: "hidden",
        padding: "36px 0",
        background: "linear-gradient(to bottom, #f1f1f1 0%, #ececec 100%)",
        borderBottom: "1px solid rgba(0,0,0,0.05)",
        position: "relative",
      }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, width: 140, height: "100%", background: "linear-gradient(to right,#f1f1f1,transparent)", zIndex: 2, pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: 0, right: 0, width: 140, height: "100%", background: "linear-gradient(to left,#ececec,transparent)", zIndex: 2, pointerEvents: "none" }} />

      <div dir="rtl" style={{ textAlign: "center", marginBottom: 20 }}>
        <Link href="/discover?src=hindawi">
          <span style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontSize: 14,
            fontFamily: "-apple-system,'SF Pro Display','SF Pro Text',sans-serif",
            fontWeight: 700,
            color: "#000",
            cursor: "pointer",
            borderBottom: "1.5px solid rgba(0,0,0,0.25)",
            paddingBottom: 2,
            transition: "color 0.2s, border-color 0.2s",
          }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.color = "#333";
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(0,0,0,0.55)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.color = "#000";
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(0,0,0,0.25)";
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
            مكتبة هنداوي العربية المجانية: كتب من المجال العام، اقرأها فوراً
          </span>
        </Link>
        <p style={{
          marginTop: 8,
          fontSize: 11,
          color: "rgba(0,0,0,0.4)",
          fontFamily: "-apple-system,'SF Pro Text',sans-serif",
        }}>
          بإذنٍ من مؤسسة هنداوي، برخصة المشاع الإبداعي نَسَب المُصنَّف 4.0 (CC BY 4.0)
        </p>
      </div>

      <Track books={HROW1} />
      <div style={{ height: 14 }} />
      <Track books={HROW2} reverse />

      <style>{`
        @keyframes bookMarquee    { from { transform: translateX(0);    } to { transform: translateX(-50%); } }
        @keyframes bookMarqueeRev { from { transform: translateX(-50%); } to { transform: translateX(0);    } }
      `}</style>
    </div>
  );
}
