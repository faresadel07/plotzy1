// Surveys the archive comics collection for golden-age series that the
// whitelist does NOT cover yet: scrapes the index, keeps items that
// look golden age (a 1930-1963 year and not junk), strips issue
// numbers from titles to form series keys, and prints the most
// frequent unmatched series with counts and a sample identifier.
// Output feeds hand-curation of the next whitelist wave.
//
// Run: node scripts/survey-unmatched.mjs

const BLOCK = /manga|manhwa|manhua|corto|maltese|tpb|-pg-|_pg\d|page-\d|complete|collection|compilation|reprint|facsimile|fac-simile|preview|sampler|annual|_full|fanzine|remix|smackjeeves|webcomic|20\d\d/i;
const UA = "PlotzySurvey/1.0";

// Current whitelist prefixes (keep in sync with the builder).
const COVERED = ["captain science","space detective","strange worlds","weird tales of the future","space action","space adventures","amazing adventures","planet comics","rocket to the moon","attack on planet mars","fantastic comics","blue beetle","phantom lady","silver streak comics","daredevil comics","amazing man comics","amazing-man comics","wonderworld comics","mystery men comics","science comics","weird comics","black terror","startling comics","thrilling comics","exciting comics","america's best comics","americas best comics","cat-man comics","catman comics","captain aero","air fighters comics","airboy comics","boy comics","mister mystery","web of mystery","weird mysteries","dark mysteries","voodoo","haunted thrills","fantastic fears","strange fantasy","journey into fear","strange mysteries","startling terror tales","ghostly weird stories","tales of horror","purple claw","horrific","weird terror","terrifying tales","black cat mystery","tomb of terror","chamber of chills","witches tales","baffling mysteries","hand of fate","the beyond","beware","chilling tales","strange terrors","frankenstein comics","jumbo comics","jungle comics","sheena","fight comics","kaanga","wings comics","rangers comics","atomic war","atomic attack","world war iii","war birds","crime does not pay","crime and punishment","crime mysteries","crime smashers","outer space","space war","mysteries of unexplored worlds","out of this world","space busters","lars of mars","crusader from mars","strange suspense stories","this magazine is haunted","beware terror tales","worlds of fear","mysterious adventures","shocking mystery cases","the horrors","blue bolt weird tales","adventures into darkness","out of the shadows","the unseen","witchcraft","fight against crime","crime and justice","lawbreakers","racket squad in action","justice traps the guilty","headline comics","real clue crime stories","crime detective comics","murder incorporated","crimes by women","famous crimes","fightin marines","fightin army","fightin navy","battlefield action","soldier and marine comics","atom age combat","captain steve savage","cowboy western","six-gun heroes","six gun heroes","black diamond western","billy the kid adventure magazine","blazing western","western crime busters","jesse james","wild bill hickok","white princess of the jungle","jungle jo","rulah","zago","terrors of the jungle","jungle thrills","dynamic comics","punch comics","prize comics","suspense comics","terrific comics","yankee comics","scoop comics","red seal comics","weird thrillers","nightmare","amazing ghost stories","weird horrors","weird adventures","weird chills","ghost comics","city of the living dead","phantom witch doctor","race for the moon","vic torry","authentic police cases","gangsters and gun molls","guns against gangsters","crime fighting detective","all famous crime","fightin air force","submarine attack","war at sea","war fury","battle cry","g.i. in battle","gi in battle","outlaws of the west","wild frontier","cody of the pony express","the westerner comics","desperado","swift arrow","firehair comics","indians","wambi","teen-age romances","teen age romances","diary secrets","cinderella love","going steady","youthful romances","daring love","romantic love","true love pictorial","coo coo comics","happy comics","goofy comics","barnyard comics","supermouse","frisky fables","unusual tales","this is suspense","the dead who walk","horror from the tomb","mysterious stories","texas rangers in action","cheyenne kid","black fury","davy crockett","robin hood and his merry men","police line-up","police lineup","prison break","criminals on the run","law against crime","real love","ten-story love","ten story love","love experiences","glamorous romances","complete love","revealing romances","secret romances","g.i. war brides","gi war brides","atomic mouse","atomic rabbit","li'l genius","lil genius"];

const norm = (s) => String(s || "").toLowerCase().replace(/[-_.]+/g, " ").replace(/\s+/g, " ").trim();

async function jget(url) {
  const r = await fetch(url, { headers: { "user-agent": UA } });
  if (!r.ok) throw new Error(`${r.status}`);
  return r.json();
}

const counts = new Map();
let cursor = "";
for (let p = 0; p < 30; p++) {
  const url = `https://archive.org/services/search/v1/scrape?q=${encodeURIComponent("collection:comics")}&count=10000&fields=identifier,title,year${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`;
  const j = await jget(url);
  for (const it of j.items ?? []) {
    const id = it.identifier;
    const title = String(Array.isArray(it.title) ? it.title[0] : it.title || "");
    const year = Number(it.year) || null;
    if (!id || !title) continue;
    if (BLOCK.test(id) || BLOCK.test(title)) continue;
    // Golden-age signal required for the survey: an explicit 1930-1963 year.
    if (!year || year < 1930 || year >= 1964) continue;
    const t = norm(title);
    if (COVERED.some((m) => t.startsWith(m) || t.includes(` ${m} `))) continue;
    // Series key: strip trailing issue markers and numbers.
    const key = t
      .replace(/\b(no|num|number|issue|vol|volume|v)\s*\d+.*$/i, "")
      .replace(/#.*$/, "")
      .replace(/\b\d{1,3}\b.*$/, "")
      .replace(/\(.*$/, "")
      .trim();
    if (key.length < 4) continue;
    const cur = counts.get(key) || { n: 0, sample: id };
    cur.n++;
    counts.set(key, cur);
  }
  if (!j.cursor) break;
  cursor = j.cursor;
  await new Promise((r) => setTimeout(r, 300));
}

const top = [...counts.entries()].filter(([, v]) => v.n >= 4).sort((a, b) => b[1].n - a[1].n);
console.log(`unmatched golden-age series with 4+ issues: ${top.length}\n`);
for (const [k, v] of top.slice(0, 120)) {
  console.log(String(v.n).padStart(4), k, " | ", v.sample);
}
