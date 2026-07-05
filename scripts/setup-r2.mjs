/**
 * Provisions Cloudflare R2 for vacation photos:
 *   - creates bucket
 *   - enables public r2.dev URL
 *   - sets CORS for browser uploads
 *   - writes R2_* vars to .env.local
 *
 * Prerequisites (pick one):
 *   A) npx wrangler login
 *   B) CLOUDFLARE_API_TOKEN in .env.local (Account → R2 → Edit)
 *
 * Run: npm run setup:r2
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline/promises";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const envPath = resolve(root, ".env.local");
const corsPath = resolve(__dirname, "r2-cors.json");

const BUCKET = process.env.R2_BUCKET_NAME ?? "vacation-photos";
const API = "https://api.cloudflare.com/client/v4";

function loadEnv() {
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (!match) continue;
    const key = match[1].trim();
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function upsertEnvVars(updates) {
  const lines = existsSync(envPath)
    ? readFileSync(envPath, "utf-8").split("\n")
    : [];

  const keys = new Set(Object.keys(updates));
  const out = [];
  const written = new Set();

  for (let line of lines) {
    const match = line.match(/^([^#=]+)=/);
    if (match && keys.has(match[1].trim())) {
      const key = match[1].trim();
      out.push(`${key}=${updates[key]}`);
      written.add(key);
      continue;
    }
    out.push(line);
  }

  if (!out.some((l) => l.trim() === "")) out.push("");
  if (!out.some((l) => l.includes("Cloudflare R2"))) {
    out.push("# Cloudflare R2");
  }

  for (const [key, value] of Object.entries(updates)) {
    if (!written.has(key)) out.push(`${key}=${value}`);
  }

  writeFileSync(envPath, out.join("\n").replace(/\n+$/, "\n"));
}

async function cfFetch(path, { method = "GET", body } = {}) {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!token) throw new Error("CLOUDFLARE_API_TOKEN is not set");

  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json();
  if (!json.success) {
    const msg = json.errors?.map((e) => e.message).join("; ") ?? res.statusText;
    throw new Error(msg);
  }
  return json;
}

async function getAccountId() {
  if (process.env.R2_ACCOUNT_ID) return process.env.R2_ACCOUNT_ID;
  if (process.env.CLOUDFLARE_ACCOUNT_ID) return process.env.CLOUDFLARE_ACCOUNT_ID;

  const { result } = await cfFetch("/accounts");
  if (!result?.length) throw new Error("No Cloudflare accounts found for this token");
  if (result.length === 1) return result[0].id;

  console.log("\nMultiple Cloudflare accounts:");
  result.forEach((a, i) => console.log(`  ${i + 1}. ${a.name} (${a.id})`));
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const pick = await rl.question("Account number [1]: ");
  rl.close();
  const idx = Math.max(0, (Number(pick) || 1) - 1);
  return result[idx].id;
}

async function setupViaApi(accountId) {
  console.log(`\n→ Creating bucket "${BUCKET}"…`);
  try {
    await cfFetch(`/accounts/${accountId}/r2/buckets`, {
      method: "POST",
      body: { name: BUCKET, locationHint: "wnam" },
    });
    console.log("  ✓ Bucket created");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.toLowerCase().includes("already exists")) {
      console.log("  ✓ Bucket already exists");
    } else {
      throw err;
    }
  }

  console.log("→ Enabling public r2.dev URL…");
  const { result: domain } = await cfFetch(
    `/accounts/${accountId}/r2/buckets/${BUCKET}/domains/managed`,
    { method: "PUT", body: { enabled: true } },
  );
  console.log(`  ✓ Public URL: https://${domain.domain}`);

  console.log("→ Setting CORS for browser uploads…");
  const cors = JSON.parse(readFileSync(corsPath, "utf-8"));
  await cfFetch(`/accounts/${accountId}/r2/buckets/${BUCKET}/cors`, {
    method: "PUT",
    body: cors,
  });
  console.log("  ✓ CORS configured (localhost:3000)");

  return `https://${domain.domain}`;
}

function setupViaWrangler() {
  console.log(`\n→ Creating bucket "${BUCKET}" via wrangler…`);
  try {
    execSync(`npx wrangler r2 bucket create ${BUCKET}`, {
      cwd: root,
      stdio: "pipe",
    });
    console.log("  ✓ Bucket created");
  } catch (err) {
    const out = err.stdout?.toString() ?? err.stderr?.toString() ?? "";
    if (out.toLowerCase().includes("already exists")) {
      console.log("  ✓ Bucket already exists");
    } else if (out) {
      console.log(out);
      throw err;
    }
  }

  console.log("→ Enabling public r2.dev URL…");
  execSync(`npx wrangler r2 bucket dev-url enable ${BUCKET}`, {
    cwd: root,
    stdio: "inherit",
  });

  const info = execSync(`npx wrangler r2 bucket dev-url get ${BUCKET}`, {
    cwd: root,
    encoding: "utf-8",
  });
  const urlMatch = info.match(/https:\/\/[^\s'"]+/);
  const publicUrl = urlMatch?.[0]?.replace(/['"]/g, "").replace(/\.+$/, "").replace(/\/+$/, "");
  if (!publicUrl) throw new Error("Could not read r2.dev URL from wrangler output");

  console.log(`  ✓ Public URL: ${publicUrl}`);

  console.log("→ Setting CORS…");
  execSync(
    `npx wrangler r2 bucket cors set ${BUCKET} --file ${corsPath}`,
    { cwd: root, stdio: "inherit" },
  );
  console.log("  ✓ CORS configured");

  return publicUrl;
}

async function promptR2Credentials(accountId, publicUrl) {
  console.log(`
────────────────────────────────────────────────────────────
Create S3-compatible API credentials (one-time):

  1. Open: https://dash.cloudflare.com/${accountId}/r2/overview/api-tokens
  2. Create Account API token → Object Read & Write
  3. Scope to bucket: ${BUCKET}
  4. Copy Access Key ID and Secret Access Key
────────────────────────────────────────────────────────────
`);

  const rl = createInterface({ input: process.stdin, output: process.stdout });

  let accessKeyId = process.env.R2_ACCESS_KEY_ID ?? "";
  let secretAccessKey = process.env.R2_SECRET_ACCESS_KEY ?? "";

  if (!accessKeyId) {
    accessKeyId = await rl.question("R2 Access Key ID: ");
  }
  if (!secretAccessKey) {
    secretAccessKey = await rl.question("R2 Secret Access Key: ");
  }
  rl.close();

  if (!accessKeyId.trim() || !secretAccessKey.trim()) {
    console.error("\nMissing credentials. Re-run after creating an R2 API token.");
    process.exit(1);
  }

  upsertEnvVars({
    R2_ACCOUNT_ID: accountId,
    R2_ACCESS_KEY_ID: accessKeyId.trim(),
    R2_SECRET_ACCESS_KEY: secretAccessKey.trim(),
    R2_BUCKET_NAME: BUCKET,
    R2_PUBLIC_URL: publicUrl,
  });

  console.log(`\n✓ Wrote R2 settings to .env.local`);
  console.log(`  Bucket:  ${BUCKET}`);
  console.log(`  Public:  ${publicUrl}`);
  console.log("\nRestart the dev server, then try an upload.");
}

async function main() {
  loadEnv();

  console.log("Cloudflare R2 setup for vacation photos\n");

  let accountId = process.env.R2_ACCOUNT_ID ?? process.env.CLOUDFLARE_ACCOUNT_ID;
  let publicUrl;

  if (process.env.CLOUDFLARE_API_TOKEN) {
    accountId = await getAccountId();
    publicUrl = await setupViaApi(accountId);
  } else {
    console.log("No CLOUDFLARE_API_TOKEN — using wrangler (run `npx wrangler login` first)\n");
    try {
      execSync("npx wrangler whoami", { cwd: root, stdio: "pipe" });
    } catch {
      console.error(`Authenticate first:

  Option A — wrangler (easiest):
    npx wrangler login
    npm run setup:r2

  Option B — API token:
    1. Create token: https://dash.cloudflare.com/profile/api-tokens
       Permission: Account → R2 → Edit
    2. Add to .env.local: CLOUDFLARE_API_TOKEN=your_token
    3. npm run setup:r2
`);
      process.exit(1);
    }
    publicUrl = setupViaWrangler();
    const whoami = execSync("npx wrangler whoami", {
      cwd: root,
      encoding: "utf-8",
    });
    const idMatch = whoami.match(/Account ID:\s*([a-f0-9]+)/i);
    accountId = idMatch?.[1] ?? accountId;
    if (!accountId) {
      console.error("Could not detect account ID. Set R2_ACCOUNT_ID in .env.local.");
      process.exit(1);
    }
  }

  await promptR2Credentials(accountId, publicUrl);
}

main().catch((err) => {
  console.error("\nSetup failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
