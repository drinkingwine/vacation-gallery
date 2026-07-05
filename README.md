# Vacation Photos

A personal vacation photo and video library built with Next.js and deployed on Vercel. **Media files** live in **Cloudflare R2**; **trip metadata** (titles, dates, captions, tags, GPS) stays in a lightweight **GitHub repo** — no database required.

## Features

- **Cloudflare R2 storage** — photos and videos uploaded directly from the browser via presigned URLs
- **GitHub for metadata** — `trip.json` and `photos-meta.json` per album
- **Trip albums** — each vacation is a folder
- **Bulk upload** — drag-and-drop up to 50 files (photos up to 25 MB, videos up to 500 MB)
- **Masonry gallery** — responsive grid with search, sort, and photo/video filter
- **Map view** — geotagged photos on Google Maps with Street View
- **Lightbox** — fullscreen viewer with keyboard navigation (← → Esc)

## Setup

### 1. Create a GitHub repo for metadata

Create a new empty repository (e.g. `your-username/vacation-photos`). Each top-level folder becomes a trip album. Only JSON metadata files are stored here — not image bytes.

### 2. Set up Cloudflare R2

```bash
npx wrangler login
npm run setup:r2
```

This creates the bucket, enables a public `r2.dev` URL, sets CORS for uploads, and writes `R2_*` vars to `.env.local`. You'll paste an **Object Read & Write** API token when prompted.

For production, add your Vercel domain to `scripts/r2-cors.json` and re-run the CORS step, or use a custom domain on the bucket.

### 3. Generate a GitHub token

Go to **GitHub → Settings → Developer settings → Fine-grained tokens** and create a token with **Read and Write** access to **Contents** on your metadata repo.

### 4. Configure environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```
GITHUB_TOKEN=github_pat_your_token_here
GITHUB_REPO=your-username/vacation-photos
GITHUB_BRANCH=main

R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
R2_BUCKET_NAME=vacation-photos
R2_PUBLIC_URL=https://pub-xxxx.r2.dev
```

### 5. Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Trip metadata

Each trip folder includes a `trip.json` with optional details:

```json
{
  "title": "Amalfi Coast",
  "location": "Italy",
  "startDate": "2024-06-12",
  "endDate": "2024-06-20",
  "description": "Cliffside villages and long dinners by the sea."
}
```

Per-photo captions, tags, and location are stored in `photos-meta.json` in the same folder.

## Deploy to Vercel

1. Push this repo to GitHub
2. Import at [vercel.com/new](https://vercel.com/new)
3. Add all environment variables from `.env.local.example`

Server-side secrets (`GITHUB_TOKEN`, R2 keys) are never exposed to the browser. Uploads go **directly to R2** using short-lived presigned URLs.

## How it works

```
GitHub (metadata)                Cloudflare R2 (media)
─────────────────                ────────────────────
amalfi-coast-2024/               amalfi-coast-2024/
  trip.json                        IMG_001.jpg
  photos-meta.json                 clip.mp4
```

- Home page lists trip folders from GitHub
- Gallery loads media URLs from R2 and merges metadata from GitHub
- Upload: `POST /api/upload/presign` → browser PUT to R2 → `POST /api/upload/complete`

## Limits

| Constraint | Value |
|------------|-------|
| Max photo size | 25 MB (compressed client-side when possible) |
| Max video size | 500 MB |
| Max files per batch | 50 |
| Photo formats | JPG, PNG, GIF, WebP, SVG, AVIF, HEIC |
| Video formats | MP4, MOV, WebM, M4V, AVI, MKV |

## Project structure

```
src/app/api/          API routes (R2 upload, GitHub metadata)
src/components/       Gallery, lightbox, upload UI, map
src/lib/r2.ts         Cloudflare R2 client
src/lib/github.ts     GitHub metadata client
src/lib/media.ts      File type helpers
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
