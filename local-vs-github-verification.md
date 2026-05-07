# Local-vs-GitHub Verification Audit

**Date:** 2026-05-07
**Local repo root:** `C:\Users\ViVoBooK\plotzy1`
**Remote:** `origin` → `https://github.com/faresadel07/plotzy1.git`
**Method:** Read-only audit. No commits, pushes, or deletions performed.

---

## 1. Working tree state — ⚠️ ATTENTION

**Modified files:** 0
**Staged files:** 0
**Untracked files:** **24**

```
git status (post-fetch): "On branch master / Your branch is up to date with 'origin/master'."
```

The 24 untracked files are working notes / design docs / audit reports — no modified or deleted source files. Categorisation in Section 9 below.

| Category | Recommendation |
|---|---|
| 0 modified source files | ✅ no action |
| 24 untracked .md / .html | See Section 9 — needs Faris's triage decision |

---

## 2. Branch state — ⚠️ ATTENTION

### Local vs origin/master sync

```
local HEAD:    c4e775df0008290514b333ba80db578c25bf70ba
origin/master: c4e775df0008290514b333ba80db578c25bf70ba   ← identical ✓
unpushed commits:  0
unpulled commits:  0
```

✅ **`master` is perfectly synced with origin.** No work-in-flight on the active branch.

### All local branches

```
* master  (synced with origin)

  Local branches with origin counterparts (have been pushed at some point — safe to leave or delete):
    feature/devices-showcase-section
    fix/chapter-editor-rules-of-hooks
    fix/group-a-typecheck
    fix/group-a2-2-response-schemas
    fix/group-a2-3-remaining-schemas
    fix/group-a2-4-residual-cleanup
    fix/group-a2-frontend-types
    fix/group-b-deps
    fix/group-c-strict-schemas
    fix/group-e-security
    fix/group-i-a11y
    fix/groups-hgjf-quality

  Local-only branches (NO remote counterpart):
    feat/course-batch-1-schema       — merged into master at a185299 (safe to delete)
    fix/price-constants-mismatch     — ⚠️ UNMERGED, last commit 2026-04-28 (ANCIENT, see below)
```

### ⚠️ The `fix/price-constants-mismatch` branch is a footgun

**Last commit:** 2026-04-28 (a single small `fix(pricing): align backend price constants with advertised UI prices` change)

**But the branch has DIVERGED RADICALLY from master since then.** A `git diff --stat master..fix/price-constants-mismatch` shows:

```
175 files changed, 2313 insertions(+), 20172 deletions(-)
```

That ~20,000-line deletion isn't bug-fix changes — it's *master moving forward without the branch*. The course feature, certificate feature, GDPR export, audit logging, token hashing, DR runbook, all the lesson markdown files, the entire database hardening cycle — none of it exists on this branch. Master has moved ~2 weeks forward; this branch is frozen at the state before all of that landed.

**If you ever accidentally `git merge fix/price-constants-mismatch`, you would silently delete two weeks of work.** The merge would look successful; you'd lose ~half the codebase.

**Recommended action:** Delete this branch. The single price-constants commit (`9681509`) it contains is either already incorporated into master OR can be cherry-picked if not (cheap to verify; the change should be small).

### `feat/course-batch-1-schema` is a zombie

Already merged into master (commit `a185299` is reachable from master). Safe to delete.

```
Severity: ⚠️ ATTENTION (the price-constants branch is a real footgun)
```

---

## 3. Stash state — ✅ CLEAN

`git stash list` returns empty. No work-in-progress stashed.

---

## 4. Untracked files inventory — ⚠️ ATTENTION (mixed)

```
24 untracked files at the repo root, all .md or .html
```

Detailed list in Section 9. Three of these are **deliverables I created in THIS session** (today, 2026-05-07) and never committed — they are referenced FROM committed docs (`db-engineering-pre-launch-final.md`, `discovered-issues.md`) but the files themselves aren't in git. If you cloned the repo cold, those references would 404.

### File-system → git tracking summary

```
Tracked files in repo:           852
Untracked files at root:          24  (all working-notes; none in src/)
Modified tracked files:            0
Deleted tracked files:             0
```

No untracked source code, configuration, or schema files. The 24 untracked items are all documentation-style content.

---

## 5. Critical files verification — ✅ CLEAN (with one expected absence)

Every file from your list is verified `exists | tracked`:

```
✓ exists | tracked | artifacts/api-server/src/lib/token-hash.ts
✓ exists | tracked | artifacts/api-server/src/lib/audit-log.ts
✓ exists | tracked | artifacts/api-server/src/lib/log-route-error.ts
✓ exists | tracked | artifacts/api-server/src/lib/data-export.ts
✓ exists | tracked | artifacts/api-server/src/services/certificate-pdf.ts
✓ exists | tracked | artifacts/api-server/src/assets/certificate-template.pdf
✓ exists | tracked | artifacts/api-server/src/assets/fonts/Inter-SemiBold.ttf
✓ exists | tracked | artifacts/api-server/src/assets/fonts/Lora-SemiBold.ttf
✓ exists | tracked | artifacts/plotzy/public/course-hero.png
✓ exists | tracked | artifacts/plotzy/public/certificate-template.png
✓ exists | tracked | lib/db/src/schema/index.ts
✓ exists | tracked | lib/db/scripts/seed-course.ts
✓ exists | tracked | docs/disaster-recovery-runbook.md
✓ exists | tracked | discovered-issues.md
✓ exists | tracked | db-engineering-pre-launch-final.md

  27 lesson markdown files in lib/db/content/*/  ✓ all present (foundation×4, architecture×4, characters×5, world×4, writing-process×5, publishing×5)
```

### Expected absences

- `course-arabic-glossary.md` — does NOT exist on disk. **Correct.** Deleted in commit `9f232b7` (`revert(course): remove Arabic translation feature`) earlier in the session. No drift.
- 4 Module 1 Arabic lesson files (`foundation/*.ar.md`) — do NOT exist on disk. **Correct.** Same commit deleted them.

```
Severity: ✅ CLEAN — every critical engineering deliverable is tracked
```

---

## 6. Sensitive file scan — ✅ CLEAN

### Files matching sensitive patterns in git history

```
.env                          → 0 commits in history (never committed)
.env.local                    → 0 commits
.env.production               → 0 commits
.env.backup-pre-sandbox       → 0 commits (locally present, gitignored)
*credential*  added files     → 0 (only commit-message references to "credentials" in OAuth setup discussions)
*_key.pem                     → 0
*secret.json                  → 0
```

### Production DB credentials in git blobs

```
git log --all -p | grep "npg_T5SYUqNH"     → 0 matches  (Neon DB password)
git log --all -p | grep "GOCSPX-Oni2QsJn"  → 0 matches  (Google OAuth secret)
git log --all -p | grep "gsk_omkihPF"      → 0 matches  (Groq API key)
git log --all -p | grep "re_hSsZGnFJ"      → 0 matches  (Resend API key)
git log --all -p | grep "EM-1GsC4NilDw"    → 0 matches  (PayPal secret)
```

### Desktop backup file

```
C:\Users\ViVoBooK\Desktop\plotzy-prod-db-backup.txt
  - exists ✓
  - 711 bytes
  - not inside any git repo (verified — "outside repository" error from git ls-files)
  - contains the production DATABASE_URL string for paste-into-Vercel
```

```
Severity: ✅ CLEAN — zero credential leak surface in git history
```

---

## 7. Build artifacts — ✅ CLEAN

```
✓ gitignored: node_modules
✓ gitignored: artifacts/api-server/dist
✓ gitignored: artifacts/plotzy/dist
✓ gitignored: lib/db/dist
✓ gitignored: lib/shared/dist
✓ gitignored: lib/api-zod/dist
✓ gitignored: lib/api-client-react/dist
✓ gitignored: artifacts/api-server/tsconfig.tsbuildinfo
✓ gitignored: artifacts/plotzy/tsconfig.tsbuildinfo
✓ gitignored: artifacts/api-server/test-edge.mjs (test scratchpad)
✓ gitignored: artifacts/api-server/test-save-mp3.mjs (test scratchpad)
✓ gitignored: audit-after.json / audit-before.json / audit-after-override.json (npm-audit output)
✓ gitignored: frontend.log
```

No build artifacts tracked. `.git` directory size: 83 MB — reasonable for the codebase volume.

---

## 8. Remote sync verification — ✅ CLEAN

```
$ git fetch origin    → no new commits
$ git status          → "Your branch is up to date with 'origin/master'."
$ git rev-parse HEAD            → c4e775df0008290514b333ba80db578c25bf70ba
$ git rev-parse origin/master   → c4e775df0008290514b333ba80db578c25bf70ba
$ git log origin/master..HEAD   → empty (no local-only commits)
$ git log HEAD..origin/master   → empty (no origin-only commits)
```

Last 5 commits on origin/master:
```
c4e775d  docs(audit): final closure summary of database engineering pre-launch cycle
9ced540  docs(audit): mark historical Issues 1-3 resolved + Issue 4 already-closed
3a5588b  Merge branch 'fix/db-historical-issues-cleanup'
f9ac8fc  fix(db): close 3 historical issues (dead write + typecheck flow + schema drift docs)
ad7a554  Merge branch 'fix/db-mediums-phase-3-gdpr-dr'
```

Master is in perfect sync with origin/master.

---

## 9. Working notes inventory — ⚠️ ATTENTION (Faris triage needed)

**24 untracked + 5 tracked working-note files at the repo root.** Detailed inventory:

### A. Untracked deliverables FROM THIS session (created today, ought to be committed)

| File | Last modified | Size | Notes |
|---|---|---:|---|
| `db-health-audit-pre-launch.md` | 2026-05-07 | 28 KB | The original 18-finding audit. **Referenced from committed `db-engineering-pre-launch-final.md`.** |
| `db-health-audit-post-mediums.md` | 2026-05-07 | 15 KB | Phase 4 re-audit deliverable. **Referenced from committed `db-engineering-pre-launch-final.md`.** |
| `db-historical-issues-verification.md` | 2026-05-07 | 11 KB | The 4-historical-issues audit. **Referenced from committed `discovered-issues.md`.** |

**These 3 files are KEY documentation outputs of the database hardening cycle and they're referenced by committed docs.** A cold clone of the repo would see broken references. Strongly recommend committing.

### B. Older working notes from earlier sessions (May 3-6, predate this session)

| File | Date | Size | Likely purpose |
|---|---|---:|---|
| `course-api-design.md` | 2026-05-05 | 25 KB | Course feature API design |
| `course-cert-pdf-design-iteration.md` | 2026-05-06 | 9 KB | Certificate PDF design notes |
| `course-certificate-pdf-design.md` | 2026-05-06 | 25 KB | Certificate PDF design |
| `course-feature-final-qa-report.md` | 2026-05-06 | 29 KB | Course QA report |
| `course-frontend-design.md` | 2026-05-05 | 27 KB | Course frontend design |
| `course-launch-readiness-final-report.md` | 2026-05-06 | 21 KB | Course readiness report |
| `course-schema-design.md` | 2026-05-05 | 22 KB | Course schema design |
| `course-visual-b1-components.md` | 2026-05-05 | 26 KB | Course visual components |
| `course-visual-b2-heroes.md` | 2026-05-05 | 13 KB | Course hero visuals |
| `course-visual-design.md` | 2026-05-05 | 33 KB | Course visual design |
| `module-1-outlines.md` | 2026-05-05 | 23 KB | Course content outlines |
| `module-2-outlines.md` | 2026-05-05 | 34 KB | Course content outlines |
| `module-3-outlines.md` | 2026-05-05 | 41 KB | Course content outlines |
| `module-4-outlines.md` | 2026-05-05 | 38 KB | Course content outlines |
| `module-5-outlines.md` | 2026-05-05 | 40 KB | Course content outlines |
| `module-6-outlines.md` | 2026-05-05 | 46 KB | Course content outlines |
| `pre-launch-audit.md` | 2026-05-03 | 31 KB | Earlier pre-launch audit |
| `pricing-rewrite-plan.md` | 2026-05-05 | 16 KB | Pricing page rewrite plan |
| `pricing-truthfulness-audit.md` | 2026-05-04 | 27 KB | Pricing audit |
| `stripe-investigation.md` | 2026-05-04 | 18 KB | Stripe→PayPal migration notes |
| `Plotzy_Investor_Brief.html` | 2026-04-30 | 84 KB | Investor brief HTML doc |

These predate this session. Decision needed:
- **Commit them** (preserve as historical engineering record) — useful for future reference
- **Move to `docs/archive/`** (organisation) — out of root, still in git
- **Add to `.gitignore`** (intentional local-only) — fast but discards the work
- **Delete** (purge) — most aggressive

I have NO context on whether these were intentional working notes (you wanted them local) or just oversights (forgot to commit). Your call.

### C. Already-tracked working notes

| File | Last modified | Size |
|---|---|---:|
| `README.md` | 2026-05-04 | 4 KB |
| `replit.md` | 2026-05-04 | 8 KB |
| `production-audit-report.md` | 2026-04-25 | 18 KB |
| `discovered-issues.md` | 2026-05-07 | 113 KB |
| `db-engineering-pre-launch-final.md` | 2026-05-07 | 14 KB |

These are correctly tracked.

```
Severity: ⚠️ ATTENTION — the 3 session-deliverable docs in (A) are the priority
```

---

## Summary

| Section | Verdict |
|---|---|
| 1. Working tree | ⚠️ 24 untracked .md/.html files (no modified source) |
| 2. Branch state | ⚠️ `fix/price-constants-mismatch` is a footgun (would wipe ~20k lines on accidental merge) |
| 3. Stash | ✅ empty |
| 4. Untracked inventory | ⚠️ same as Section 1 |
| 5. Critical files | ✅ all 14 critical paths verified tracked |
| 6. Sensitive scan | ✅ zero credential leak in git history |
| 7. Build artifacts | ✅ all properly gitignored |
| 8. Remote sync | ✅ master == origin/master at `c4e775df` |
| 9. Working notes | ⚠️ 3 deliverable docs referenced-but-untracked |

---

## Action plan

### 🚨 No CRITICAL items — none of the issues block launch.

### ⚠️ HIGH priority — 5-10 minutes total

1. **Commit the 3 audit reports created in this session** so the references in `db-engineering-pre-launch-final.md` and `discovered-issues.md` resolve correctly:
   ```
   git add db-health-audit-pre-launch.md db-health-audit-post-mediums.md db-historical-issues-verification.md local-vs-github-verification.md
   git commit -m "docs(audit): preserve audit reports referenced by closure summary"
   git push origin master
   ```
   *(Includes this report itself — a record of the verification audit that confirmed launch-readiness.)*
   **Effort:** 2 min.

2. **Delete the `fix/price-constants-mismatch` footgun branch.** First confirm the price-constants commit is either obsolete or already in master (5 min review of the diff at commit `9681509`):
   ```
   git show 9681509 --stat
   git log --grep "price.*constant" --oneline   # check if equivalent change is on master
   git branch -D fix/price-constants-mismatch
   ```
   **Effort:** 5 min (the review takes longer than the delete).

### 📌 MEDIUM priority — 15-20 minutes

3. **Triage the 21 older working notes from earlier sessions.** Decision tree per file:
   - Course design / outlines / audits: candidates for `docs/archive/` if you want to preserve the engineering record. The course content (lesson markdowns) is already tracked at `lib/db/content/*/`; these are the planning/decision docs that produced it.
   - `Plotzy_Investor_Brief.html`: investor-facing doc — depends on whether it's a draft (gitignore) or a final asset (commit / move to docs).
   - `stripe-investigation.md`, `pricing-*-audit.md`: historical migration record — useful as `docs/archive/` material.
   
   **Effort:** ~1 minute per file × 21 files. OR a single `git add` + commit if you want to preserve everything as-is. OR a single `.gitignore` rule (`*-design.md`, `module-*-outlines.md`, `pricing-*.md`, `stripe-*.md`, `course-*-report.md`, `pre-launch-audit.md`, `Plotzy_Investor_Brief.html`) if you want them all local-only.

### 📝 LOW priority — 1 minute

4. **Delete the merged-and-zombie `feat/course-batch-1-schema` branch:**
   ```
   git branch -d feat/course-batch-1-schema
   ```
   It's fully merged into master — safe.

### Total effort to reach 100% sync state

- **Minimum (just close the documentation gap):** 2 minutes (item 1 only).
- **Recommended (close the gap + remove the footgun branch):** 7 minutes (items 1+2).
- **Thorough cleanup (everything triaged):** 20-30 minutes.

---

## Verdict

🟡 **MINOR ITEMS — small cleanups recommended but not blocking launch.**

The core engineering state is excellent:
- ✅ master perfectly synced with origin
- ✅ every critical engineering file tracked
- ✅ zero credentials in git history
- ✅ all build artifacts gitignored
- ✅ no work-in-progress stashed
- ✅ no modified or deleted source files

The four small concerns are:
1. Three audit reports from THIS session are on disk but not in git (5-min commit closes this — recommended before launch so the documentation trail is complete).
2. One ancient unmerged branch (`fix/price-constants-mismatch`) that would silently delete ~20k lines of recent work if accidentally merged. Should be deleted after confirming the small price-constants change is already in master or harmless to drop.
3. Twenty-one older working notes (course design / outlines / audits / pricing notes) sit in the working tree untracked. Either harmless (you intended them local) or oversights (you wanted them committed). Needs your triage call.
4. One zombie branch (`feat/course-batch-1-schema`) safely deletable.

None of these are launch blockers. Proceeding to deploy with the current `master` at `c4e775df` is safe — every line of code that runs in production is in git, in sync, and reviewable.

End of verification audit.
