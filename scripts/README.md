# Plotzy maintenance scripts

## migrate-covers-to-files.mjs

One-time migration that moves book cover images out of the database (where
they sit as huge `data:image/...;base64,...` strings) and onto disk as
static files served by Vercel.

### Why

Every Discover / Library page view was pulling the full base64 cover for
every listed book out of Neon. That alone was the dominant source of
free-tier data-transfer consumption. After this migration, each
`coverImage` column becomes a tiny URL (`/uploads/covers/27.png`) and the
image is served by Vercel's CDN, not the database.

### Prerequisites

- Neon DB must be under its monthly data-transfer cap. If the script
  prints `Your project has exceeded the data transfer quota`, wait for
  the monthly reset and try again.
- Run from the repo root (the script resolves paths relative to it).

### Usage

```bash
# Dry run: shows what would happen without writing anything.
node scripts/migrate-covers-to-files.mjs --dry-run

# Live migration of published books only (default and safest):
node scripts/migrate-covers-to-files.mjs

# Live migration of ALL books, including unpublished ones:
PUBLISHED_ONLY=false node scripts/migrate-covers-to-files.mjs
```

After running:

```bash
git add artifacts/plotzy/public/uploads/covers/
git commit -m "chore(covers): migrated existing book covers to static files"
git push
```

Then Promote on Vercel so the new image files are served.

### What is NOT covered by this script

New uploads (a user designing or uploading a cover today) still go to the
database as base64. The proper follow-up is a cloud blob store (Vercel
Blob, Supabase Storage or Cloudflare R2) wired into the cover-designer
save flow. See the in-flight notes for that work.
