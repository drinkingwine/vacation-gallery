"use client";

import { useCallback, useEffect, useState } from "react";
import {
  GALLERY_HOME_READY_EVENT,
  GALLERY_REFRESH_EVENT,
} from "@/lib/gallery-admin";
import { getCachedGalleryHome, loadGalleryHome } from "@/lib/gallery-home-cache";
import type { GalleryHomeData } from "@/lib/gallery-home-data";

export type GalleryHomeSlice = "trips" | "people" | "places" | "things";

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

  const sync = useCallback(() => {
    const cached = getCachedGalleryHome();
    if (!cached) return;
    setValue(cached[slice] as Value);
  }, [slice]);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    sync();
    void loadGalleryHome({ force }).finally(() => {
      if (cancelled) return;
      sync();
      setLoading(false);
    });
    window.addEventListener(GALLERY_HOME_READY_EVENT, sync);
    window.addEventListener(GALLERY_REFRESH_EVENT, sync);
    return () => {
      cancelled = true;
      window.removeEventListener(GALLERY_HOME_READY_EVENT, sync);
      window.removeEventListener(GALLERY_REFRESH_EVENT, sync);
    };
  }, [force, sync]);

  return {
    value,
    loading,
  };
}
