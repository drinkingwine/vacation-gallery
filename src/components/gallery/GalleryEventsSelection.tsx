"use client";

import { useMemo } from "react";
import { GallerySelectionShell } from "@/components/gallery/GallerySelectionShell";
import { LightGalleryCollectionPicker } from "@/components/gallery/LightGalleryCollectionPicker";
import { useGalleryHomeSlice } from "@/hooks/use-gallery-home-cache";
import { galleryCopy } from "@/lib/gallery-copy";
import { eventGalleryPath } from "@/lib/events-gallery";

export function GalleryEventsSelection() {
  const { value: events, loading } = useGalleryHomeSlice("events");

  const items = useMemo(
    () =>
      events.map((item) => ({
        key: item.slug,
        href: eventGalleryPath(item.slug),
        title: item.label,
        coverUrl: item.coverUrl,
        count: item.photoCount,
      })),
    [events],
  );

  return (
    <GallerySelectionShell
      title="Events"
      loading={loading}
      empty={!loading && events.length === 0}
      contentClassName="contents"
      emptyMessage={galleryCopy.events.empty}
    >
      <LightGalleryCollectionPicker items={items} />
    </GallerySelectionShell>
  );
}
