import type { R2MediaObject } from "@/lib/r2";
import { listMedia } from "@/lib/r2";

const TTL_MS = 60_000;

const cache = new Map<string, { at: number; data: R2MediaObject[] }>();

function cacheKey(trip: string) {
  return trip || "__root__";
}

export function invalidateMediaListCache(trip?: string) {
  if (trip === undefined) {
    cache.clear();
    return;
  }
  cache.delete(cacheKey(trip));
}

export async function listMediaCached(trip = ""): Promise<R2MediaObject[]> {
  const key = cacheKey(trip);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) {
    return hit.data;
  }

  const data = await listMedia(trip);
  cache.set(key, { at: Date.now(), data });
  return data;
}
