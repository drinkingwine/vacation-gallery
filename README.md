# Vacation Photos

A personal vacation photo library built with Next.js and deployed on Vercel. Photos are stored in a **GitHub repository** — no database or object storage required. Inspired by [github-photos](https://github.com/Aayush-N/github-photos).

## Features

- **GitHub as storage** — photos committed to a repo via the GitHub Contents API
- **Trip albums** — each vacation is a folder in your photos repo
- **Bulk upload** — drag-and-drop up to 50 photos, 5 concurrent uploads
- **Masonry gallery** — responsive grid with search and sort
- **Lightbox** — fullscreen viewer with keyboard navigation (← → Esc)

## Setup

### 1. Create a GitHub repo for photos

Create a new empty repository (e.g. `your-username/vacation-photos`). Each top-level folder becomes a trip album.

### 2. Generate a GitHub token

Go to **GitHub → Settings → Developer settings → Fine-grained tokens** and create a token with **Read and Write** access to **Contents** on your photos repo.

### 3. Configure environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local` (or use your `gh` token):

```
GITHUB_TOKEN=github_pat_your_token_here
GITHUB_REPO=drinkingwine/vacation-photos
GITHUB_BRANCH=main
```

A photos repo has been created at [github.com/drinkingwine/vacation-photos](https://github.com/drinkingwine/vacation-photos).

### 4. Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Trip metadata

Each trip folder can include a `trip.json` with optional details:

```json
{
  "title": "Amalfi Coast",
  "location": "Italy",
  "startDate": "2024-06-12",
  "endDate": "2024-06-20",
  "description": "Cliffside villages and long dinners by the sea."
}
```

When creating a trip via the upload UI, you can fill these in directly. You can also edit `trip.json` on GitHub.

### Seed a sample trip

```bash
node scripts/seed-sample-trip.mjs
```

## Deploy to Vercel

1. Push this repo to GitHub
2. Import at [vercel.com/new](https://vercel.com/new)
3. Add environment variables in the Vercel dashboard:
   - `GITHUB_TOKEN`
   - `GITHUB_REPO`
   - `GITHUB_BRANCH` (optional, defaults to `main`)

`GITHUB_TOKEN` is server-side only — used in API routes, never exposed to the browser.

## How it works

```
your-photos-repo/
  amalfi-coast-2024/
    IMG_001.jpg
    IMG_002.jpg
  iceland-2023/
    northern-lights.jpg
```

- Home page lists folders as trips
- `/trips/amalfi-coast-2024` shows photos in that folder
- Upload UI commits new files via `POST /api/upload`

## Limits

| Constraint | Value |
|------------|-------|
| Max file size | 25 MB (GitHub API limit) |
| Max files per batch | 50 |
| Formats | JPG, PNG, GIF, WebP, SVG, AVIF, HEIC |

## Project structure

```
src/app/api/          GitHub-backed API routes
src/components/       Gallery, lightbox, upload UI
src/lib/github.ts     GitHub Contents API client
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
