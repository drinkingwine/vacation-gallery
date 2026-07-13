"use client";

import { GallerySelectionShell } from "@/components/gallery/GallerySelectionShell";
import { PlaceCard } from "@/components/gallery/PlaceCard";
import { useGalleryHomeSlice } from "@/hooks/use-gallery-home-cache";
import { galleryCopy } from "@/lib/gallery-copy";

export function GalleryPlacesSelection() {
  const { value: places, loading } = useGalleryHomeSlice("places");

  return (
    <GallerySelectionShell
      title="Places"
      description={galleryCopy.places.description}
      count={places.length}
      countLabel={places.length === 1 ? "place" : "places"}
      loading={loading}
      empty={!loading && places.length === 0}
      emptyMessage={galleryCopy.places.empty}
    >
      {places.map((place, index) => (
        <PlaceCard
          key={place.slug}
          place={place}
          priority={index < 6}
          index={index}
        />
      ))}
    </GallerySelectionShell>
  );
}
