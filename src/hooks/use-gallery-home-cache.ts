"use client";

import { useCallback, useEffect, useState } from "react";
import { GALLERY_HOME_READY_EVENT } from "@/lib/gallery-admin";
import { getCachedGalleryHome } from "@/lib/gallery-home-cache";
import type { GalleryHomeData } from "@/lib/gallery-home-data";

export type GalleryHomeSlice = "trips" | "people" | "places";

export function useGalleryHomeSlice<T extends GalleryHomeSlice>(slice: T) {
  type Value = GalleryHomeData[T];

  const [hydrated, setHydrated] = useState(false);
  const [value, setValue] = useState<Value>(() => [] as Value);
  const [ready, setReady] = useState(false);

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
    sync();
    window.addEventListener(GALLERY_HOME_READY_EVENT, sync);
    return () => window.removeEventListener(GALLERY_HOME_READY_EVENT, sync);
  }, [sync]);

  return {
    value: hydrated && ready ? value : ([] as Value),
    loading: !hydrated || !ready,
  };
}
