"use client";

import { useMemo } from "react";
import { GallerySelectionShell } from "@/components/gallery/GallerySelectionShell";
import { LightGalleryCollectionPicker } from "@/components/gallery/LightGalleryCollectionPicker";
import { useGalleryHomeSlice } from "@/hooks/use-gallery-home-cache";
import { galleryCopy } from "@/lib/gallery-copy";
import { placeGalleryPath } from "@/lib/places-gallery";

export function GalleryPlacesSelection() {
  const { value: places, loading } = useGalleryHomeSlice("places");

  const items = useMemo(
    () =>
      places.map((place) => ({
        key: place.slug,
        href: placeGalleryPath(place.slug),
        title: place.title,
        coverUrl: place.coverUrl,
        count: place.tripCount,
        countLabel: `${place.tripCount} ${place.tripCount === 1 ? "trip" : "trips"}`,
        meta: place.tripLocations,
      })),
    [places],
  );

  return (
    <GallerySelectionShell
      title="Places"
      loading={loading}
      empty={!loading && places.length === 0}
      contentClassName="contents"
      emptyMessage={galleryCopy.places.empty}
    >
      <LightGalleryCollectionPicker items={items} />
    </GallerySelectionShell>
  );
}
