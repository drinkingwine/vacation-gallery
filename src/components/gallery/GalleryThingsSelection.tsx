"use client";

import { useMemo } from "react";
import { GallerySelectionShell } from "@/components/gallery/GallerySelectionShell";
import { LightGalleryCollectionPicker } from "@/components/gallery/LightGalleryCollectionPicker";
import { useGalleryHomeSlice } from "@/hooks/use-gallery-home-cache";
import { galleryCopy } from "@/lib/gallery-copy";
import { thingGalleryPath } from "@/lib/things-gallery";

export function GalleryThingsSelection() {
  const { value: things, loading } = useGalleryHomeSlice("things");

  const items = useMemo(
    () =>
      things.map((thing) => ({
        key: thing.tag,
        href: thingGalleryPath(thing.tag),
        title: thing.label,
        coverUrl: thing.coverUrl,
        count: thing.photoCount,
      })),
    [things],
  );

  return (
    <GallerySelectionShell
      title="Things"
      loading={loading}
      empty={!loading && things.length === 0}
      contentClassName="contents"
      emptyMessage={galleryCopy.things.empty}
    >
      <LightGalleryCollectionPicker items={items} />
    </GallerySelectionShell>
  );
}
