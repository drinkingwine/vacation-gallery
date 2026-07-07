import type { Trip } from "@/lib/types";

let cache: Trip[] | null = null;
let inflight: Promise<Trip[]> | null = null;

export function getCachedTrips(): Trip[] | null {
  return cache;
}

export function invalidateTripsCache(): void {
  cache = null;
  inflight = null;
}

async function fetchTrips(): Promise<Trip[]> {
  const res = await fetch("/api/trips");
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }

  const data = (await res.json()) as Trip[];
  cache = data;
  return data;
}

export async function loadTrips(options?: { force?: boolean }): Promise<Trip[]> {
  if (options?.force) {
    cache = null;
  } else if (cache) {
    return cache;
  }

  if (inflight) return inflight;

  inflight = fetchTrips().finally(() => {
    inflight = null;
  });

  return inflight;
}

export function prefetchTrips(): void {
  if (cache || inflight) return;
  void loadTrips();
}

export function prefetchTripsWhenIdle(): void {
  if (typeof window === "undefined") return;

  const run = () => prefetchTrips();
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(run, { timeout: 2000 });
  } else {
    setTimeout(run, 500);
  }
}
