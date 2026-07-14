"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import type { TripMediaFilterValue } from "@/components/TripMediaFilter";
import { requestGalleryPhotoEdit } from "@/lib/gallery-admin";
import { galleryVideoWatchPath } from "@/lib/edit-paths";
import { buildGalleryItem } from "@/lib/gallery";
import type { GalleryItem } from "@/lib/gallery";
import { parsePhotoTimestamp } from "@/lib/photo-timestamp";
import { FAVORITE_TAG } from "@/lib/photo-tags";
import type { Photo, Trip } from "@/lib/types";

const LightGalleryAlbum = dynamic(
  () =>
    import("@/components/gallery/LightGalleryAlbum").then((mod) => ({
      default: mod.LightGalleryAlbum,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="aspect-4/5 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800"
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
  mediaFilter?: TripMediaFilterValue;
  onMediaFilterChange?: (value: TripMediaFilterValue) => void;
};

export function TripPhotoGallery({
  photos,
  trip,
  tripName,
  loading,
  emptyMessage,
  isAdmin: isAdminProp,
  coverPhoto = null,
  coverUrl = null,
  onPhotoChanged,
  mediaFilter: mediaFilterProp,
  onMediaFilterChange,
}: TripPhotoGalleryProps) {
  const { isAdmin: authIsAdmin } = useAuth();
  const isAdmin = isAdminProp ?? authIsAdmin;
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | number | null>(null);
  const [internalMediaFilter, setInternalMediaFilter] =
    useState<TripMediaFilterValue>("all");

  const mediaFilter = mediaFilterProp ?? internalMediaFilter;
  const setMediaFilter = onMediaFilterChange ?? setInternalMediaFilter;

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

  const filteredItems = useMemo(() => {
    if (mediaFilter === "photo") {
      return items.filter((item) => item.type !== "video");
    }
    if (mediaFilter === "video") {
      return items.filter((item) => item.type === "video");
    }
    return items;
  }, [items, mediaFilter]);

  useEffect(() => {
    setSelectedId(null);
  }, [mediaFilter]);

  // If current filter has no items left (e.g. last video deleted), fall back to All.
  useEffect(() => {
    if (mediaFilter === "all") return;
    if (filteredItems.length > 0) return;
    if (items.length > 0) setMediaFilter("all");
  }, [filteredItems.length, items.length, mediaFilter, setMediaFilter]);

  const isCoverPhoto = useCallback(
    (item: GalleryItem) => {
      if (coverPhoto && item.filename === coverPhoto) return true;
      return false;
    },
    [coverPhoto],
  );

  const handleToggleDefault = useCallback(
    async (item: GalleryItem) => {
      const isDefault =
        Boolean(coverPhoto && item.filename === coverPhoto);
      const res = await fetch(
        `/api/trips/${encodeURIComponent(tripName)}/cover`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            isDefault
              ? { photoName: null, clear: true }
              : { photoName: item.filename },
          ),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        alert(
          data.error ??
            (isDefault
              ? "Failed to clear default photo"
              : "Failed to set default photo"),
        );
        return;
      }
      onPhotoChanged?.();
    },
    [coverPhoto, onPhotoChanged, tripName],
  );

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="aspect-4/5 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800"
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

  if (filteredItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-zinc-400">
        <p className="text-sm">
          {mediaFilter === "video"
            ? "No videos in this trip"
            : mediaFilter === "photo"
              ? "No photos in this trip"
              : (emptyMessage ?? "No media found")}
        </p>
      </div>
    );
  }

  return (
    <LightGalleryAlbum
      items={filteredItems}
      selectedId={selectedId}
      onSelectedIdChange={setSelectedId}
      onVideoOpen={(item) => {
        const href = galleryVideoWatchPath(
          item,
          `/trips/${encodeURIComponent(tripName)}`,
        );
        if (href) router.push(href);
      }}
      isAdmin={isAdmin}
      onEdit={(item) =>
        requestGalleryPhotoEdit(
          item,
          `/trips/${encodeURIComponent(tripName)}`,
        )
      }
      onMakeDefault={
        isAdmin ? (item) => void handleToggleDefault(item) : undefined
      }
      isCoverPhoto={isCoverPhoto}
    />
  );
}
