"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { buildGalleryItem, toLightGalleryElements } from "@/lib/gallery";
import { parsePhotoTimestamp } from "@/lib/photo-timestamp";
import { FAVORITE_TAG } from "@/lib/photo-tags";
import type { Photo, Trip } from "@/lib/types";

const LightGalleryInlineCarousel = dynamic(
  () =>
    import("@/components/gallery/LightGalleryInlineCarousel").then((mod) => ({
      default: mod.LightGalleryInlineCarousel,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="vc-lg-inline-container animate-pulse rounded-2xl bg-zinc-200/80 dark:bg-zinc-800/80" />
    ),
  },
);

type TripPhotoGalleryProps = {
  photos: Photo[];
  trip: Trip | null;
  tripName: string;
  loading?: boolean;
  emptyMessage?: string;
  isAdmin?: boolean;
  coverPhoto?: string | null;
  coverUrl?: string | null;
  onPhotoChanged?: () => void;
};

export function TripPhotoGallery({
  photos,
  trip,
  tripName,
  loading,
  emptyMessage,
}: TripPhotoGalleryProps) {
  const items = useMemo(() => {
    const built = photos.map((photo) =>
      buildGalleryItem({
        ...photo,
        id: photo.path,
        tripName,
        tripTitle: trip?.title ?? tripName.replace(/-/g, " "),
        tripLocation: trip?.location,
        tripStartDate: trip?.startDate,
      }),
    );

    const dateByPath = new Map(photos.map((photo) => [photo.path, photo.dateTaken]));

    const compareByDateAsc = (a: (typeof built)[number], b: (typeof built)[number]) => {
      const timeA =
        parsePhotoTimestamp(dateByPath.get(a.path)) ?? Number.POSITIVE_INFINITY;
      const timeB =
        parsePhotoTimestamp(dateByPath.get(b.path)) ?? Number.POSITIVE_INFINITY;
      if (timeA !== timeB) return timeA - timeB;
      return a.filename.localeCompare(b.filename);
    };

    const hasAssignedTag = (item: (typeof built)[number]) =>
      (item.tags ?? []).some((tag) => tag.toLowerCase() !== FAVORITE_TAG);

    return [...built].sort((a, b) => {
      const aTagged = hasAssignedTag(a);
      const bTagged = hasAssignedTag(b);
      if (aTagged !== bTagged) return aTagged ? 1 : -1;
      return compareByDateAsc(a, b);
    });
  }, [photos, trip?.location, trip?.startDate, trip?.title, tripName]);

  const elements = useMemo(() => toLightGalleryElements(items), [items]);

  if (loading) {
    return (
      <div className="vc-lg-inline-container animate-pulse rounded-2xl bg-zinc-200/80 dark:bg-zinc-800/80" />
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-zinc-400">
        <p className="text-sm">{emptyMessage ?? "No photos found"}</p>
      </div>
    );
  }

  return <LightGalleryInlineCarousel elements={elements} />;
}
