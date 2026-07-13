"use client";

import { GallerySelectionShell } from "@/components/gallery/GallerySelectionShell";
import { ThingCard } from "@/components/gallery/ThingCard";
import { useGalleryHomeSlice } from "@/hooks/use-gallery-home-cache";
import { galleryCopy } from "@/lib/gallery-copy";

export function GalleryThingsSelection() {
  const { value: things, loading } = useGalleryHomeSlice("things");

  return (
    <GallerySelectionShell
      title="Things"
      description={galleryCopy.things.description}
      count={things.length}
      countLabel={things.length === 1 ? "subject" : "subjects"}
      loading={loading}
      empty={!loading && things.length === 0}
      emptyMessage={galleryCopy.things.empty}
    >
      {things.map((thing, index) => (
        <ThingCard
          key={thing.tag}
          thing={thing}
          priority={index < 6}
          index={index}
        />
      ))}
    </GallerySelectionShell>
  );
}
