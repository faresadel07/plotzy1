// Builds a VERIFIED catalogue of public-domain golden-age comics from
// the Internet Archive's community "comics" collection, at real scale.
//
// v5 strategy:
//   1. Scrape the ENTIRE collection index (identifier/title/year) via
//      the scrape API with cursor paging (~117k rows, a dozen calls).
//   2. Filter locally against the PD series whitelist (the Digital
//      Comic Museum canon of defunct publishers), a junk blocklist,
//      and a hard golden-age year gate.
//   3. Verify each survivor live with 6-way concurrency: metadata,
//      page count from scandata.xml (16..110), PDF filename capture.
//   4. Save incrementally and RESUME across runs: already-processed
//      ids are skipped, so re-running only handles the remainder.
//
// Run (repeat until it prints DONE): node scripts/build-comics-catalog.mjs

import { readFileSync, writeFileSync, existsSync } from "node:fs";

// [match, display series, genre] — match is tested against the
// normalized title start and the normalized identifier.
const SERIES = [
  ["captain science", "Captain Science", "scifi"],
  ["space detective", "Space Detective", "scifi"],
  ["strange worlds", "Strange Worlds", "scifi"],
  ["weird tales of the future", "Weird Tales of the Future", "scifi"],
  ["space action", "Space Action", "scifi"],
  ["space adventures", "Space Adventures", "scifi"],
  ["amazing adventures", "Amazing Adventures", "scifi"],
  ["planet comics", "Planet Comics", "scifi"],
  ["rocket to the moon", "Rocket to the Moon", "scifi"],
  ["attack on planet mars", "Attack on Planet Mars", "scifi"],
  ["fantastic comics", "Fantastic", "hero"],
  ["blue beetle", "Blue Beetle", "hero"],
  ["phantom lady", "Phantom Lady", "hero"],
  ["silver streak comics", "Silver Streak", "hero"],
  ["daredevil comics", "Daredevil", "hero"],
  ["amazing man comics", "Amazing Man", "hero"],
  ["amazing-man comics", "Amazing Man", "hero"],
  ["wonderworld comics", "Wonderworld", "hero"],
  ["mystery men comics", "Mystery Men", "hero"],
  ["science comics", "Science Comics", "hero"],
  ["weird comics", "Weird Comics", "hero"],
  ["black terror", "Black Terror", "hero"],
  ["startling comics", "Startling Comics", "hero"],
  ["thrilling comics", "Thrilling Comics", "hero"],
  ["exciting comics", "Exciting Comics", "hero"],
  ["america's best comics", "America's Best", "hero"],
  ["americas best comics", "America's Best", "hero"],
  ["cat-man comics", "Cat-Man", "hero"],
  ["catman comics", "Cat-Man", "hero"],
  ["captain aero", "Captain Aero", "hero"],
  ["air fighters comics", "Air Fighters", "hero"],
  ["airboy comics", "Airboy", "hero"],
  ["boy comics", "Boy Comics", "hero"],
  ["crack western", "", ""], // Quality: never include (empty genre = reject)
  ["mister mystery", "Mister Mystery", "horror"],
  ["web of mystery", "Web of Mystery", "horror"],
  ["weird mysteries", "Weird Mysteries", "horror"],
  ["dark mysteries", "Dark Mysteries", "horror"],
  ["voodoo", "Voodoo", "horror"],
  ["haunted thrills", "Haunted Thrills", "horror"],
  ["fantastic fears", "Fantastic Fears", "horror"],
  ["strange fantasy", "Strange Fantasy", "horror"],
  ["journey into fear", "Journey into Fear", "horror"],
  ["strange mysteries", "Strange Mysteries", "horror"],
  ["startling terror tales", "Startling Terror Tales", "horror"],
  ["ghostly weird stories", "Ghostly Weird Stories", "horror"],
  ["tales of horror", "Tales of Horror", "horror"],
  ["purple claw", "The Purple Claw", "horror"],
  ["horrific", "Horrific", "horror"],
  ["weird terror", "Weird Terror", "horror"],
  ["terrifying tales", "Terrifying Tales", "horror"],
  ["black cat mystery", "Black Cat Mystery", "horror"],
  ["tomb of terror", "Tomb of Terror", "horror"],
  ["chamber of chills", "Chamber of Chills", "horror"],
  ["witches tales", "Witches Tales", "horror"],
  ["baffling mysteries", "Baffling Mysteries", "horror"],
  ["hand of fate", "Hand of Fate", "horror"],
  ["the beyond", "The Beyond", "horror"],
  ["beware", "Beware", "horror"],
  ["chilling tales", "Chilling Tales", "horror"],
  ["strange terrors", "Strange Terrors", "horror"],
  ["frankenstein comics", "Frankenstein", "horror"],
  ["jumbo comics", "Jumbo Comics", "jungle"],
  ["jungle comics", "Jungle Comics", "jungle"],
  ["sheena", "Sheena", "jungle"],
  ["fight comics", "Fight Comics", "jungle"],
  ["kaanga", "Kaanga", "jungle"],
  ["wings comics", "Wings Comics", "war"],
  ["rangers comics", "Rangers Comics", "war"],
  ["atomic war", "Atomic War", "war"],
  ["atomic attack", "Atomic Attack", "war"],
  ["world war iii", "World War III", "war"],
  ["war birds", "War Birds", "war"],
  ["crime does not pay", "Crime Does Not Pay", "crime"],
  ["crime and punishment", "Crime and Punishment", "crime"],
  ["crime mysteries", "Crime Mysteries", "crime"],
  ["crime smashers", "Crime Smashers", "crime"],
  // ── Expansion wave 2 ──────────────────────────────────────────────
  // Charlton (famously unrenewed) sci-fi / war / western lines,
  // Fawcett's lapsed horror books, Nedor horror, Story, Star, Prize
  // and Hillman crime, Fox and Avon jungle/crime, Chesler heroes.
  ["outer space", "Outer Space", "scifi"],
  ["space war", "Space War", "scifi"],
  ["mysteries of unexplored worlds", "Mysteries of Unexplored Worlds", "scifi"],
  ["out of this world", "Out of This World", "scifi"],
  ["space busters", "Space Busters", "scifi"],
  ["lars of mars", "Lars of Mars", "scifi"],
  ["crusader from mars", "Crusader from Mars", "scifi"],
  ["strange suspense stories", "Strange Suspense Stories", "horror"],
  ["this magazine is haunted", "This Magazine Is Haunted", "horror"],
  ["beware terror tales", "Beware Terror Tales", "horror"],
  ["worlds of fear", "Worlds of Fear", "horror"],
  ["mysterious adventures", "Mysterious Adventures", "horror"],
  ["shocking mystery cases", "Shocking Mystery Cases", "horror"],
  ["the horrors", "The Horrors", "horror"],
  ["blue bolt weird tales", "Blue Bolt Weird Tales", "horror"],
  ["adventures into darkness", "Adventures into Darkness", "horror"],
  ["out of the shadows", "Out of the Shadows", "horror"],
  ["the unseen", "The Unseen", "horror"],
  ["witchcraft", "Witchcraft", "horror"],
  ["fight against crime", "Fight Against Crime", "crime"],
  ["crime and justice", "Crime and Justice", "crime"],
  ["lawbreakers", "Lawbreakers", "crime"],
  ["racket squad in action", "Racket Squad in Action", "crime"],
  ["justice traps the guilty", "Justice Traps the Guilty", "crime"],
  ["headline comics", "Headline Comics", "crime"],
  ["real clue crime stories", "Real Clue Crime Stories", "crime"],
  ["crime detective comics", "Crime Detective", "crime"],
  ["murder incorporated", "Murder Incorporated", "crime"],
  ["crimes by women", "Crimes by Women", "crime"],
  ["famous crimes", "Famous Crimes", "crime"],
  ["fightin marines", "Fightin Marines", "war"],
  ["fightin army", "Fightin Army", "war"],
  ["fightin navy", "Fightin Navy", "war"],
  ["battlefield action", "Battlefield Action", "war"],
  ["soldier and marine comics", "Soldier and Marine", "war"],
  ["atom age combat", "Atom Age Combat", "war"],
  ["captain steve savage", "Captain Steve Savage", "war"],
  ["cowboy western", "Cowboy Western", "western"],
  ["six-gun heroes", "Six-Gun Heroes", "western"],
  ["six gun heroes", "Six-Gun Heroes", "western"],
  ["black diamond western", "Black Diamond Western", "western"],
  ["billy the kid adventure magazine", "Billy the Kid", "western"],
  ["blazing western", "Blazing Western", "western"],
  ["western crime busters", "Western Crime Busters", "western"],
  ["jesse james", "Jesse James", "western"],
  ["wild bill hickok", "Wild Bill Hickok", "western"],
  ["white princess of the jungle", "White Princess of the Jungle", "jungle"],
  ["jungle jo", "Jungle Jo", "jungle"],
  ["rulah", "Rulah", "jungle"],
  ["zago", "Zago", "jungle"],
  ["terrors of the jungle", "Terrors of the Jungle", "jungle"],
  ["jungle thrills", "Jungle Thrills", "jungle"],
  ["dynamic comics", "Dynamic Comics", "hero"],
  ["punch comics", "Punch Comics", "hero"],
  ["prize comics", "Prize Comics", "hero"],
  // ── Expansion wave 3 ──────────────────────────────────────────────
  // More Charlton war/western, Ziff-Davis and St. John horror,
  // Continental/Holyoke, Star and Novelty crime, Fiction House
  // jungle/ghost, plus two new PD-rich genres: St. John / Fox romance
  // and Nedor funny animals.
  ["suspense comics", "Suspense Comics", "horror"],
  ["terrific comics", "Terrific Comics", "hero"],
  ["yankee comics", "Yankee Comics", "hero"],
  ["scoop comics", "Scoop Comics", "hero"],
  ["red seal comics", "Red Seal Comics", "hero"],
  ["weird thrillers", "Weird Thrillers", "horror"],
  ["nightmare", "Nightmare", "horror"],
  ["amazing ghost stories", "Amazing Ghost Stories", "horror"],
  ["weird horrors", "Weird Horrors", "horror"],
  ["weird adventures", "Weird Adventures", "horror"],
  ["weird chills", "Weird Chills", "horror"],
  ["ghost comics", "Ghost Comics", "horror"],
  ["city of the living dead", "City of the Living Dead", "horror"],
  ["phantom witch doctor", "Phantom Witch Doctor", "horror"],
  ["race for the moon", "Race for the Moon", "scifi"],
  ["vic torry", "Vic Torry and His Flying Saucer", "scifi"],
  ["authentic police cases", "Authentic Police Cases", "crime"],
  ["gangsters and gun molls", "Gangsters and Gun Molls", "crime"],
  ["guns against gangsters", "Guns Against Gangsters", "crime"],
  ["crime fighting detective", "Crime Fighting Detective", "crime"],
  ["all famous crime", "All Famous Crime", "crime"],
  ["fightin air force", "Fightin Air Force", "war"],
  ["submarine attack", "Submarine Attack", "war"],
  ["war at sea", "War at Sea", "war"],
  ["war fury", "War Fury", "war"],
  ["battle cry", "Battle Cry", "war"],
  ["g.i. in battle", "G.I. in Battle", "war"],
  ["gi in battle", "G.I. in Battle", "war"],
  ["outlaws of the west", "Outlaws of the West", "western"],
  ["wild frontier", "Wild Frontier", "western"],
  ["cody of the pony express", "Cody of the Pony Express", "western"],
  ["the westerner comics", "The Westerner", "western"],
  ["desperado", "Desperado", "western"],
  ["swift arrow", "Swift Arrow", "western"],
  ["firehair comics", "Firehair", "western"],
  ["indians", "Indians", "western"],
  ["wambi", "Wambi the Jungle Boy", "jungle"],
  ["teen-age romances", "Teen-Age Romances", "romance"],
  ["teen age romances", "Teen-Age Romances", "romance"],
  ["diary secrets", "Diary Secrets", "romance"],
  ["cinderella love", "Cinderella Love", "romance"],
  ["going steady", "Going Steady", "romance"],
  ["youthful romances", "Youthful Romances", "romance"],
  ["daring love", "Daring Love", "romance"],
  ["romantic love", "Romantic Love", "romance"],
  ["true love pictorial", "True Love Pictorial", "romance"],
  ["coo coo comics", "Coo Coo Comics", "funny"],
  ["happy comics", "Happy Comics", "funny"],
  ["goofy comics", "Goofy Comics", "funny"],
  ["barnyard comics", "Barnyard Comics", "funny"],
  ["supermouse", "Supermouse", "funny"],
  ["frisky fables", "Frisky Fables", "funny"],
  // ── Expansion wave 4 ──────────────────────────────────────────────
  // Charlton's famously unrenewed 1950s lines (Ditko-era suspense,
  // Atomic Mouse funny animals, the western stable), Ace romances to
  // fill the romance genre, plus Avon / Star / Premiere crime and
  // horror stragglers.
  ["unusual tales", "Unusual Tales", "horror"],
  ["this is suspense", "This Is Suspense", "horror"],
  ["the dead who walk", "The Dead Who Walk", "horror"],
  ["horror from the tomb", "Horror from the Tomb", "horror"],
  ["mysterious stories", "Mysterious Stories", "horror"],
  ["texas rangers in action", "Texas Rangers in Action", "western"],
  ["cheyenne kid", "Cheyenne Kid", "western"],
  ["black fury", "Black Fury", "western"],
  ["davy crockett", "Davy Crockett", "western"],
  ["robin hood and his merry men", "Robin Hood", "western"],
  ["police line-up", "Police Line-Up", "crime"],
  ["police lineup", "Police Line-Up", "crime"],
  ["prison break", "Prison Break", "crime"],
  ["criminals on the run", "Criminals on the Run", "crime"],
  ["law against crime", "Law Against Crime", "crime"],
  ["real love", "Real Love", "romance"],
  ["ten-story love", "Ten-Story Love", "romance"],
  ["ten story love", "Ten-Story Love", "romance"],
  ["love experiences", "Love Experiences", "romance"],
  ["glamorous romances", "Glamorous Romances", "romance"],
  ["complete love", "Complete Love", "romance"],
  ["revealing romances", "Revealing Romances", "romance"],
  ["secret romances", "Secret Romances", "romance"],
  ["g.i. war brides", "G.I. War Brides", "romance"],
  ["gi war brides", "G.I. War Brides", "romance"],
  ["atomic mouse", "Atomic Mouse", "funny"],
  ["atomic rabbit", "Atomic Rabbit", "funny"],
  ["li'l genius", "Li'l Genius", "funny"],
  ["lil genius", "Li'l Genius", "funny"],
];

const BLOCK = /manga|manhwa|manhua|corto|maltese|tpb|-pg-|_pg\d|page-\d|complete|collection|compilation|reprint|facsimile|fac-simile|preview|sampler|annual|_full|fanzine|remix|smackjeeves|webcomic|20\d\d/i;

const UA = "PlotzyComicsCatalog/1.0 (contact: plotzy.co)";
const OUT = new URL("./comics-catalog.json", import.meta.url);
const PROCESSED = new URL("./comics-processed.json", import.meta.url);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const norm = (s) => String(s || "").toLowerCase().replace(/[-_.]+/g, " ").replace(/\s+/g, " ").trim();

function matchSeries(title, id) {
  const t = norm(title);
  const i = norm(id);
  for (const [m, series, genre] of SERIES) {
    // Word-boundary match anywhere in the title (catches uploads with
    // prefixes like "1953 - Mister Mystery 12"), or identifier start.
    const at = t.indexOf(m);
    const titleHit =
      at !== -1 &&
      (at === 0 || t[at - 1] === " ") &&
      (at + m.length === t.length || /[\s#0-9]/.test(t[at + m.length]));
    if (titleHit || i.startsWith(m)) {
      if (!genre) return null; // explicit never-include
      return { series, genre };
    }
  }
  return null;
}

async function jget(url) {
  const r = await fetch(url, { headers: { "user-agent": UA } });
  if (!r.ok) throw new Error(`${r.status}`);
  return r.json();
}

async function tget(url) {
  const r = await fetch(url, { headers: { "user-agent": UA } });
  if (!r.ok) throw new Error(`${r.status}`);
  return r.text();
}

function parseIssue(str) {
  const m = String(str).match(/(?:^|[^0-9])0*([0-9]{1,3})(?:[^0-9]|$)/);
  return m ? Number(m[1]) : null;
}

// ── 1+2: scrape the collection index and filter locally ────────────
console.log("scraping collection index...");
const candidates = [];
let cursor = "";
for (let pageN = 0; pageN < 30; pageN++) {
  const url = `https://archive.org/services/search/v1/scrape?q=${encodeURIComponent("collection:comics")}&count=10000&fields=identifier,title,year${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`;
  const j = await jget(url);
  for (const it of j.items ?? []) {
    const id = it.identifier;
    const title = Array.isArray(it.title) ? it.title[0] : it.title;
    const year = Number(it.year) || null;
    if (!id || BLOCK.test(id) || BLOCK.test(String(title || ""))) continue;
    if (year && (year >= 1964 || year < 1930)) continue;
    const hit = matchSeries(title, id);
    if (!hit) continue;
    candidates.push({ id, title: String(title || ""), year, ...hit });
  }
  if (!j.cursor) break;
  cursor = j.cursor;
  await sleep(300);
}
console.log(`candidates after filter: ${candidates.length}`);

// ── Resume state ────────────────────────────────────────────────────
const accepted = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : [];
const processed = new Set(existsSync(PROCESSED) ? JSON.parse(readFileSync(PROCESSED, "utf8")) : []);
// Only keep resume entries that are still v5-shaped (have pdf key).
const priorOk = accepted.filter((a) => "pdf" in a);
const out = priorOk;
out.forEach((a) => processed.add(a.id));
const todo = candidates.filter((c) => !processed.has(c.id));
console.log(`already accepted: ${out.length}, to process: ${todo.length}`);

function save() {
  writeFileSync(OUT, JSON.stringify(out, null, 1));
  writeFileSync(PROCESSED, JSON.stringify([...processed]));
}

// ── 3: verify survivors with concurrency ───────────────────────────
async function verify(c) {
  try {
    const meta = await jget(`https://archive.org/metadata/${c.id}`);
    const hay = `${c.id} ${meta?.metadata?.title || ""} ${meta?.metadata?.date || ""}`;
    if (BLOCK.test(hay)) return null;
    const ym = String(meta?.metadata?.date || meta?.metadata?.year || "").match(/(19|20)\d{2}/);
    let year = ym ? Number(ym[0]) : c.year;
    if (!year) {
      const tm = hay.match(/19[3-5]\d/);
      year = tm ? Number(tm[0]) : null;
    }
    if (year && (year >= 1964 || year < 1930)) return null;

    let count = Number(meta?.metadata?.imagecount);
    if (!Number.isFinite(count)) {
      const scan = (meta?.files || []).find((f) => /_scandata\.xml$/i.test(f.name));
      if (!scan) return null;
      const xml = await tget(`https://archive.org/download/${c.id}/${encodeURIComponent(scan.name)}`);
      count = (xml.match(/<page\s/g) || []).length;
    }
    if (!Number.isFinite(count) || count < 16 || count > 130) return null;

    const pdfFile = (meta?.files || []).find(
      (f) => /\.pdf$/i.test(f.name) && !/_text\.pdf$/i.test(f.name),
    );
    const issue = parseIssue(meta?.metadata?.title || "") ?? parseIssue(c.id);
    return {
      id: c.id,
      series: c.series,
      issue,
      year: year ? String(year) : "",
      pages: count,
      pdf: pdfFile ? pdfFile.name : null,
      genre: c.genre,
    };
  } catch {
    return null;
  }
}

const seenIssue = new Map();
out.forEach((e, idx) => seenIssue.set(`${e.series}|${e.issue ?? e.id}`, idx));

let i = 0;
let done = 0;
await Promise.all(
  Array.from({ length: 6 }, async () => {
    while (i < todo.length) {
      const c = todo[i++];
      const e = await verify(c);
      processed.add(c.id);
      if (e) {
        const key = `${e.series}|${e.issue ?? e.id}`;
        const prior = seenIssue.get(key);
        if (prior !== undefined) {
          if (e.pages > out[prior].pages) out[prior] = e;
        } else {
          seenIssue.set(key, out.length);
          out.push(e);
        }
      }
      done++;
      if (done % 50 === 0) {
        save();
        console.log(`processed ${done}/${todo.length}, accepted total ${out.length}`);
      }
      await sleep(50);
    }
  }),
);

save();
console.log(`\nTOTAL ACCEPTED: ${out.length}`);
console.log(todo.length === 0 ? "DONE (nothing left to process)" : "DONE (run again if interrupted)");
