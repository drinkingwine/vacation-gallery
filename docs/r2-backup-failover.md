# R2 Backup & Failover — Architecture Review

**Status:** Proposal / future consideration  
**Date:** July 2026  
**Context:** Discussion of adding a localhost PostgreSQL database synced with Cloudflare R2 for disaster recovery and potential failover to localhost or `www.ralphporter.net`.

---

## Current Architecture

The app uses a **two-store split** with no server database:

| Layer | Store | Contents |
|-------|--------|----------|
| **Media** | Cloudflare R2 | Photo/video bytes only (`{trip-folder}/{filename}`, plus `Favorites/` copies) |
| **Metadata** | GitHub repo | `trip.json`, `photos-meta.json` per trip (titles, dates, captions, tags, GPS, favorites links) |

### Key files

| Area | Path |
|------|------|
| R2 client (S3 API) | `src/lib/r2.ts` |
| GitHub metadata | `src/lib/github.ts` |
| Upload presign | `src/app/api/upload/presign/route.ts` |
| Upload complete | `src/app/api/upload/complete/route.ts` |
| Existing R2 backup | `src/app/api/backup/route.ts` |
| Favorites duplication | `src/lib/favorites-trip.ts` |

### Upload flow

```
Browser → POST /api/upload/presign → presigned R2 URL
Browser → PUT R2 (direct)
Browser → POST /api/upload/complete → headMedia + upsertPhotoMetadata → GitHub
```

### Read flow

```
API route → listTrips/listPhotos (github.ts)
         → listMedia(trip) from R2
         → getPhotosMetadata(trip) from GitHub
         → merge into Photo objects
```

### Existing backup

- **Route:** `POST /api/backup` (admin UI in `AppNavbar`)
- **Behavior:** Full copy of `R2_BUCKET_NAME` → `R2_BACKUP_BUCKET_NAME`
- **Limitations:**
  - Media only — GitHub metadata not included
  - No incremental/delta sync
  - No restore path in code
  - Backup bucket not created by `setup:r2` (manual)
  - Same Cloudflare account — not off-account redundancy

---

## Proposal Discussed

Add a **localhost PostgreSQL database** kept in sync with R2 so that if R2 fails, backups of all R2-stored data could be shown on localhost or `www.ralphporter.net`.

---

## Assessment

### What Postgres is good for

1. **Sync manifest** — object keys, sizes, etags, last-seen-in-R2, last-synced-to-local, sync status
2. **Metadata mirror** — denormalized trip/photo rows from GitHub JSON for local queries and drift detection
3. **Reconciliation** — detect orphans: in R2 but not GitHub, in GitHub but missing from R2, stale local copies
4. **Local admin tooling** — inventory browse, backup orchestration, audit without hitting external APIs

### What Postgres is a poor fit for

- **Storing media blobs** (`BYTEA` / large objects) — expensive, slow, wrong tool for photo/video at scale
- **Production failover by itself** — a DB on localhost does not serve `ralphporter.net` without hosted replication and app changes

**Better for bytes:** local filesystem mirror, or a second object store (Backblaze B2, AWS S3, separate R2 account).

---

## Critical gap today

R2 backup alone is **incomplete**. Restoring media without GitHub metadata produces broken galleries (files with no captions, tags, or trip context). Restoring GitHub without R2 produces metadata pointing at missing files.

**Treat R2 primary + GitHub repo as a coupled pair** for any failover plan.

### What to back up

| Priority | Asset | Notes |
|----------|--------|-------|
| Critical | Primary R2 bucket | All photo/video bytes |
| Critical | GitHub metadata repo | `trip.json` + `photos-meta.json`; git history is natural backup |
| Important | R2 backup bucket | Same account — not account-loss protection |
| Important | Secrets / env | `R2_*`, `GITHUB_TOKEN`, `SESSION_SECRET`, `R2_PUBLIC_URL` |
| Important | CORS / public URL config | Reproducible from `scripts/setup-r2.mjs`, `scripts/r2-cors.json` |
| Not needed | Browser sessionStorage/localStorage | Ephemeral UI caches |
| Not needed | App source | Already in git |

### Known risks

| Risk | Impact |
|------|--------|
| No GitHub backup in app | R2-only backup loses all captions, tags, trip info |
| No restore path | Backup copies R2→R2 but nothing promotes backup → primary |
| Favorites duplicate media | `Favorites/` folder copies bytes; restore must include or re-favorite |
| Orphan uploads | R2 PUT without `/upload/complete` → file exists, no GitHub meta |
| Single-account R2 backup | No protection against Cloudflare account loss |

---

## Recommended topology

### Tier 1 — highest value, lowest complexity

1. **GitHub mirror** — second remote or periodic clone to NAS/local disk
2. **Improve R2 backup** — incremental sync, scheduled runs, documented restore runbook
3. **Off-account copy** — R2 → local disk, B2, or S3 (not same-account-only)

### Tier 2 — local disaster-read mode

```
R2 (primary)  ──sync──▶  local disk (e.g. /data/vacations-media)
GitHub        ──clone──▶  local git mirror
Postgres (optional) ──tracks──▶  sync state + denormalized metadata
```

During R2 outage on localhost: serve from local files + read metadata from git clone or Postgres. Requires an env flag or storage backend switch in the app.

### Tier 3 — production failover (`www.ralphporter.net`)

Local Postgres does **not** help production unless you also:

- Replicate to a **hosted** DB or metadata service
- Maintain a **hot/warm second bucket** or CDN origin switch
- Change the app's read path for metadata and media URLs

This is a separate, larger project than local backup.

---

## Pros and cons of local Postgres

### Pros

- Clear inventory of expected vs actual objects
- Drift detection and backup job orchestration
- Foundation for search, reporting, or NL query over trips/photos
- Metadata snapshot independent of GitHub API availability

### Cons

- **Third source of truth** — R2 + GitHub + Postgres can diverge without strict sync rules
- **Sync complexity** — uploads are two-phase (R2 then GitHub); failures create orphans
- **Operational burden** — migrations, Postgres backups, sync job monitoring
- **Duplicates GitHub** unless Postgres is strictly a cache/index, not authoritative
- **Does not solve production failover** without additional cloud infrastructure

---

## Sync design concerns (if implemented)

1. **Direction** — one-way mirror (R2 → local, GitHub → Postgres) is much simpler than bidirectional sync
2. **Favorites** — `Favorites/` duplicates bytes; manifest must account for copied objects
3. **Orphans** — presigned upload without `/upload/complete` leaves R2 objects without metadata
4. **Consistency** — no single transaction across R2 and GitHub today; fixing this needs an outbox/queue pattern, not just a mirror
5. **Scope** — decide upfront: **disaster recovery** (read-only local gallery) vs **high availability** (production keeps serving)

---

## Suggested implementation sequence

| Step | Action | Postgres required? |
|------|--------|-------------------|
| 1 | GitHub mirror + verify metadata integrity | No |
| 2 | R2 incremental backup + restore runbook | No |
| 3 | Local filesystem sync job (R2 → disk) | Optional manifest |
| 4 | Postgres sync ledger + drift reports | Yes |
| 5 | App env flag for local media/metadata backend | Yes (or git only) |
| 6 | Production failover (second bucket, hosted metadata) | Hosted DB optional |

---

## Decision summary

| Goal | Local Postgres? | Better first step |
|------|-----------------|-------------------|
| Backup all R2 media | No — use disk or second object store | Scheduled R2 → local/NAS/B2 + restore runbook |
| Backup metadata | Optional — git clone is simpler | Git mirror |
| Know what's in sync | Yes — good fit | Sync manifest (Postgres or SQLite) |
| Browse gallery locally when R2 is down | Postgres + **local files**, not blobs in DB | Local media mirror + storage backend switch |
| Keep production up when R2 fails | No — needs cloud failover | Second bucket/CDN + metadata fallback in cloud |

**Bottom line:** Frame the project as **local media mirror + metadata mirror, with Postgres optional as sync ledger** — not "Postgres in sync with R2." Postgres adds the most value for reconciliation and operability; the backup payload should live on disk or another object store, and GitHub must be included in any backup story.

---

## Open questions for future review

- [ ] Acceptable recovery time (RTO) and recovery point (RPO)?
- [ ] Is localhost read-only during outage sufficient, or must production stay up?
- [ ] Postgres vs SQLite for a single-machine sync manifest?
- [ ] Where should local media live (NAS path, external drive, cloud sync folder)?
- [ ] Should backup runs be manual (admin button) or scheduled (cron, GitHub Action, local daemon)?
- [ ] Bidirectional sync ever needed, or one-way mirror only?
- [ ] How to handle `Favorites/` — include in mirror as-is or dedupe on restore?
