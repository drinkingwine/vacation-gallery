import type { PersonSummary } from "@/lib/people-gallery";
import type { PlaceSummary } from "@/lib/places-gallery";

type CacheEntry<T> = {
  data: T | null;
  inflight: Promise<T> | null;
};

function createListCache<T>(fetcher: () => Promise<T>) {
  const entry: CacheEntry<T> = { data: null, inflight: null };

  return {
    get(): T | null {
      return entry.data;
    },
    invalidate() {
      entry.data = null;
      entry.inflight = null;
    },
    async load(options?: { force?: boolean }): Promise<T> {
      if (options?.force) {
        entry.data = null;
      } else if (entry.data) {
        return entry.data;
      }

      if (entry.inflight) return entry.inflight;

      entry.inflight = fetcher()
        .then((data) => {
          entry.data = data;
          return data;
        })
        .finally(() => {
          entry.inflight = null;
        });

      return entry.inflight;
    },
    prefetch() {
      if (entry.data || entry.inflight) return;
      void this.load();
    },
  };
}

async function fetchPeople(): Promise<PersonSummary[]> {
  const res = await fetch("/api/people");
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }
  const data = (await res.json()) as { people: PersonSummary[] };
  return data.people;
}

async function fetchPlaces(): Promise<PlaceSummary[]> {
  const res = await fetch("/api/places");
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }
  const data = (await res.json()) as { places: PlaceSummary[] };
  return data.places;
}

export const peopleListCache = createListCache(fetchPeople);
export const placesListCache = createListCache(fetchPlaces);

export function invalidateGalleryListCaches(): void {
  peopleListCache.invalidate();
  placesListCache.invalidate();
}

export function prefetchGalleryLists(): void {
  peopleListCache.prefetch();
  placesListCache.prefetch();
}

export function prefetchGalleryListsWhenIdle(): void {
  if (typeof window === "undefined") return;

  const run = () => prefetchGalleryLists();
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(run, { timeout: 4000 });
  } else {
    setTimeout(run, 1500);
  }
}
