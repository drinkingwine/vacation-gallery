"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { buildGalleryItem, getItemDisplayTags } from "@/lib/gallery";
import { parsePhotoTimestamp } from "@/lib/photo-exif";
import { FAVORITE_TAG } from "@/lib/photo-tags";
import type { Photo, Trip } from "@/lib/types";

const Gallery25 = dynamic(
  () =>
    import("@/components/gallery/Gallery25").then((mod) => ({
      default: mod.Gallery25,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="aspect-[4/5] animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800"
          />
        ))}
      </div>
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
  isAdmin = false,
  coverPhoto = null,
  coverUrl = null,
  onPhotoChanged,
}: TripPhotoGalleryProps) {
  const baseItems = useMemo(
    () =>
      photos.map((photo) =>
        buildGalleryItem({
          ...photo,
          id: photo.path,
          tripName,
          tripTitle: trip?.title ?? tripName.replace(/-/g, " "),
          tripLocation: trip?.location,
          tripStartDate: trip?.startDate,
        }),
      ),
    [photos, trip?.location, trip?.startDate, trip?.title, tripName],
  );
  const photoDateTakenByPath = useMemo(
    () => new Map(photos.map((photo) => [photo.path, photo.dateTaken])),
    [photos],
  );
  const [itemTagPatches, setItemTagPatches] = useState<Record<string, string[]>>(
    {},
  );

  useEffect(() => {
    setItemTagPatches({});
  }, [photos]);

  const items = useMemo(() => {
    const merged = baseItems.map((item) =>
      itemTagPatches[item.id]
        ? { ...item, tags: itemTagPatches[item.id] }
        : item,
    );

    const compareByDateAsc = (a: (typeof merged)[number], b: (typeof merged)[number]) => {
      const timeA =
        parsePhotoTimestamp(photoDateTakenByPath.get(a.path)) ??
        Number.POSITIVE_INFINITY;
      const timeB =
        parsePhotoTimestamp(photoDateTakenByPath.get(b.path)) ??
        Number.POSITIVE_INFINITY;
      if (timeA !== timeB) return timeA - timeB;
      return a.filename.localeCompare(b.filename);
    };

    if (!isAdmin) {
      return [...merged].sort(compareByDateAsc);
    }

    return [...merged].sort((a, b) => {
      const aTagged = getItemDisplayTags(a, 100).some(
        (tag) => tag.toLowerCase() !== FAVORITE_TAG,
      );
      const bTagged = getItemDisplayTags(b, 100).some(
        (tag) => tag.toLowerCase() !== FAVORITE_TAG,
      );
      if (aTagged !== bTagged) return aTagged ? 1 : -1;
      return compareByDateAsc(a, b);
    });
  }, [baseItems, isAdmin, itemTagPatches, photoDateTakenByPath]);

  const handleItemTagsChange = useCallback((itemId: string, tags: string[]) => {
    setItemTagPatches((prev) => ({ ...prev, [itemId]: tags }));
  }, []);

  const makeDefault = useCallback(
    async (photoName: string) => {
      const res = await fetch(
        `/api/trips/${encodeURIComponent(tripName)}/cover`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ photoName }),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to set default photo");
      }
      onPhotoChanged?.();
    },
    [onPhotoChanged, tripName],
  );

  const handleMakeDefault = useCallback(
    (item: { filename: string }) => {
      void makeDefault(item.filename).catch((err) => {
        alert(err instanceof Error ? err.message : "Failed to set default photo");
      });
    },
    [makeDefault],
  );

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="aspect-[4/5] animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800"
          />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-zinc-400">
        <p className="text-sm">{emptyMessage ?? "No photos found"}</p>
      </div>
    );
  }

  return (
    <Gallery25
      items={items}
      showHeader={false}
      tripTitle={trip?.title ?? tripName.replace(/-/g, " ")}
      clickToEdit={isAdmin}
      allowCardDelete={isAdmin}
      coverPhoto={coverPhoto}
      coverUrl={coverUrl}
      onMakeDefault={isAdmin ? handleMakeDefault : undefined}
      onPhotoChanged={onPhotoChanged}
      onItemTagsChange={handleItemTagsChange}
    />
  );
}
