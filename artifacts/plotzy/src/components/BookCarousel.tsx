/* ROW1: original Project Gutenberg covers (confirmed working)
   ROW2: Open Library by ISBN, with blank-image detection (OL returns 1×1 gif for missing covers) */

const gutCover = (id: number) =>
  `https://www.gutenberg.org/cache/epub/${id}/pg${id}.cover.medium.jpg`;

const olCover = (isbn: string) =>
  `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`;

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
    <div className="group" style={{ overflow: "hidden" }}>
      <div
        style={{ display: "flex", width: "max-content", animation: `${animName} 45s linear infinite` }}
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

      <p style={{ textAlign: "center", fontSize: 13, letterSpacing: "0.18em", textTransform: "uppercase", color: "#000", fontFamily: "-apple-system,'SF Pro Display','SF Pro Text',sans-serif", fontWeight: 600, marginBottom: 20 }}>
        Public Domain Classics
      </p>

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
