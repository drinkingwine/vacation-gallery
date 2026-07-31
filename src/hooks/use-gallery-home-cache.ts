"use client";

import { useCallback, useEffect, useState } from "react";
import {
  GALLERY_HOME_READY_EVENT,
  GALLERY_REFRESH_EVENT,
} from "@/lib/gallery-admin";
import { getCachedGalleryHome, loadGalleryHome } from "@/lib/gallery-home-cache";
import type { GalleryHomeData } from "@/lib/gallery-home-data";

export type GalleryHomeSlice =
  | "trips"
  | "people"
  | "places"
  | "things"
  | "stuff";

type UseGalleryHomeSliceOptions = {
  /** When true, bypass cache and refetch from the API. */
  force?: boolean;
};

export function useGalleryHomeSlice<T extends GalleryHomeSlice>(
  slice: T,
  options?: UseGalleryHomeSliceOptions,
) {
  type Value = GalleryHomeData[T];

  const force = options?.force ?? false;
  // Defer sessionStorage reads until after mount so SSR and the first client
  // render both start empty (avoids hydration mismatch with cached trips).
  const [value, setValue] = useState<Value>(() => [] as Value);
  const [loading, setLoading] = useState(true);

  const syncFromCache = useCallback(() => {
    const cached = getCachedGalleryHome();
    if (!cached) return;
    setValue(cached[slice] as Value);
  }, [slice]);

  useEffect(() => {
    let cancelled = false;

    const load = (nextForce: boolean) => {
      setLoading(true);
      syncFromCache();
      void loadGalleryHome({ force: nextForce })
        .then((data) => {
          if (cancelled) return;
          setValue(data[slice] as Value);
        })
        .catch(() => {
          if (cancelled) return;
          syncFromCache();
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    };

    load(force);

    const onReady = () => syncFromCache();
    const onRefresh = () => load(true);

    window.addEventListener(GALLERY_HOME_READY_EVENT, onReady);
    window.addEventListener(GALLERY_REFRESH_EVENT, onRefresh);
    return () => {
      cancelled = true;
      window.removeEventListener(GALLERY_HOME_READY_EVENT, onReady);
      window.removeEventListener(GALLERY_REFRESH_EVENT, onRefresh);
    };
  }, [force, slice, syncFromCache]);

  return {
    value,
    loading,
  };
}
