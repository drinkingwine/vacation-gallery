import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile(path: string) {
  try {
    const text = readFileSync(path, "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // ignore missing
  }
}

loadEnvFile(resolve(process.cwd(), ".env.local"));
loadEnvFile(resolve(process.cwd(), ".env"));

import { patchTripMetadata } from "../src/lib/github";

const STUFF_TRIPS = ["Ireland-2014-Wedding", "Wheaton-Flood-2013"];

async function main() {
  for (const tripName of STUFF_TRIPS) {
    const metadata = await patchTripMetadata(tripName, { kind: "stuff" });
    console.log(`Updated ${tripName}: kind=${metadata.kind}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
