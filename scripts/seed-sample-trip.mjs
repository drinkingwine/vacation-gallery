/**
 * Seeds a sample trip folder in the GitHub photos repo.
 * Run: node scripts/seed-sample-trip.mjs
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadEnv() {
  try {
    const envPath = resolve(root, ".env.local");
    const lines = readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) process.env[match[1].trim()] = match[2].trim();
    }
  } catch {
    // use existing env
  }
}

loadEnv();

const token = process.env.GITHUB_TOKEN;
const repo = process.env.GITHUB_REPO;
const branch = process.env.GITHUB_BRANCH ?? "main";

if (!token || !repo) {
  console.error("Set GITHUB_TOKEN and GITHUB_REPO in .env.local first.");
  process.exit(1);
}

const [owner, repoName] = repo.split("/");
const tripName = "amalfi-coast-2024";
const tripJson = {
  title: "Amalfi Coast",
  location: "Italy",
  startDate: "2024-06-12",
  endDate: "2024-06-20",
  description:
    "Cliffside villages, lemon groves, and long dinners overlooking the Tyrrhenian Sea.",
};

const path = `${tripName}/trip.json`;
const content = Buffer.from(JSON.stringify(tripJson, null, 2)).toString("base64");
const url = `https://api.github.com/repos/${owner}/${repoName}/contents/${path}`;

const check = await fetch(`${url}?ref=${branch}`, {
  headers: {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
  },
});

let sha;
if (check.ok) {
  const existing = await check.json();
  sha = existing.sha;
  console.log("Sample trip already exists — updating trip.json");
}

const res = await fetch(url, {
  method: "PUT",
  headers: {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    message: "Add sample Amalfi Coast trip",
    content,
    branch,
    ...(sha ? { sha } : {}),
  }),
});

if (!res.ok) {
  console.error("Failed:", await res.text());
  process.exit(1);
}

console.log(`✓ Seeded ${tripName} in ${repo}`);
console.log(`  View: https://github.com/${repo}/tree/${branch}/${tripName}`);
console.log("  Upload photos via the app or drop files in that folder on GitHub.");
