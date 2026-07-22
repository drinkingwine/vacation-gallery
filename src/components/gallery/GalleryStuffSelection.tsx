"use client";

import { useMemo } from "react";
import { GallerySelectionShell } from "@/components/gallery/GallerySelectionShell";
import { LightGalleryCollectionPicker } from "@/components/gallery/LightGalleryCollectionPicker";
import { useGalleryHomeSlice } from "@/hooks/use-gallery-home-cache";
import { galleryCopy } from "@/lib/gallery-copy";
import { stuffGalleryPath } from "@/lib/stuff-gallery";

export function GalleryStuffSelection() {
  const { value: stuff, loading } = useGalleryHomeSlice("stuff");

  const items = useMemo(
    () =>
      stuff.map((item) => ({
        key: item.slug,
        href: stuffGalleryPath(item.slug),
        title: item.label,
        coverUrl: item.coverUrl,
        count: item.photoCount,
      })),
    [stuff],
  );

  return (
    <GallerySelectionShell
      title="Stuff"
      loading={loading}
      empty={!loading && stuff.length === 0}
      contentClassName="contents"
      emptyMessage={galleryCopy.stuff.empty}
    >
      <LightGalleryCollectionPicker items={items} />
    </GallerySelectionShell>
  );
}
