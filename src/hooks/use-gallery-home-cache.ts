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
  fresh?: boolean;
};

export function useGalleryHomeSlice<T extends GalleryHomeSlice>(
  slice: T,
  options?: UseGalleryHomeSliceOptions,
) {
  type Value = GalleryHomeData[T];

  const [hydrated, setHydrated] = useState(false);
  const [value, setValue] = useState<Value>(() => [] as Value);
  const [ready, setReady] = useState(false);
  const fresh = options?.fresh ?? false;

  const sync = useCallback(() => {
    const cached = getCachedGalleryHome();
    if (!cached) {
      setReady(false);
      return;
    }
    setValue(cached[slice] as Value);
    setReady(true);
  }, [slice]);

  useEffect(() => {
    setHydrated(true);
    void loadGalleryHome({ force: fresh }).finally(() => sync());
    window.addEventListener(GALLERY_HOME_READY_EVENT, sync);
    window.addEventListener(GALLERY_REFRESH_EVENT, sync);
    return () => {
      window.removeEventListener(GALLERY_HOME_READY_EVENT, sync);
      window.removeEventListener(GALLERY_REFRESH_EVENT, sync);
    };
  }, [fresh, sync]);

  return {
    value: hydrated && ready ? value : ([] as Value),
    loading: !hydrated || !ready,
  };
}
