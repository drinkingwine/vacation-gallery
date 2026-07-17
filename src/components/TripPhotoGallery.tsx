"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Tags } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import {
  GalleryGridControls,
  type GalleryGridMediaFilter,
} from "@/components/gallery/GalleryGridControls";
import {
  TripTagFilter,
  type TripTagOption,
} from "@/components/TripTagFilter";
import { invalidateGalleryHomeCache } from "@/lib/gallery-home-cache";
import { requestGalleryPhotoEdit, refreshGallery } from "@/lib/gallery-admin";
import { galleryVideoWatchPath } from "@/lib/edit-paths";
import { buildGalleryItem, itemHasAssignedTags } from "@/lib/gallery";
import type { GalleryItem } from "@/lib/gallery";
import { parsePhotoTimestamp } from "@/lib/photo-timestamp";
import {
  formatTagLabel,
  getPresetTagColorClasses,
  hasPhotoTag,
  PRESET_PHOTO_TAG_SECTIONS,
} from "@/lib/photo-tags";
import { patchCachedTripPhoto } from "@/lib/trip-page-cache";
import type { Photo, Trip } from "@/lib/types";
import { cn } from "@/lib/utils";

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
  mediaFilter?: GalleryGridMediaFilter;
  onMediaFilterChange?: (value: GalleryGridMediaFilter) => void;
  tagFilter?: string | null;
  onTagFilterChange?: (tag: string | null) => void;
  tagOptions?: TripTagOption[];
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
  tagFilter = null,
  onTagFilterChange,
  tagOptions = [],
}: TripPhotoGalleryProps) {
  const { isAdmin: authIsAdmin } = useAuth();
  const isAdmin = isAdminProp ?? authIsAdmin;
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | number | null>(null);
  const [internalMediaFilter, setInternalMediaFilter] =
    useState<GalleryGridMediaFilter>("all");
  const [taggingMode, setTaggingMode] = useState(false);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [tagOverrides, setTagOverrides] = useState<Map<string, string[]>>(
    () => new Map(),
  );
  const [taggingBusyId, setTaggingBusyId] = useState<string | null>(null);
  const [tagsVisible, setTagsVisible] = useState(false);

  const mediaFilter = mediaFilterProp ?? internalMediaFilter;
  const setMediaFilter = onMediaFilterChange ?? setInternalMediaFilter;

  useEffect(() => {
    setTagOverrides(new Map());
  }, [photos]);

  useEffect(() => {
    if (!isAdmin && taggingMode) {
      setTaggingMode(false);
      setActiveTag(null);
    }
  }, [isAdmin, taggingMode]);

  const items = useMemo(() => {
    const built = photos.map((photo) =>
      buildGalleryItem({
        ...photo,
        id: photo.path,
        tripName,
        tripTitle: trip?.title ?? tripName.replace(/-/g, " "),
        tripLocation: trip?.location,
        tripStartDate: trip?.startDate,
        tags: tagOverrides.get(photo.path) ?? photo.tags ?? [],
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

    return [...built].sort((a, b) => {
      // Admin: tagged photos sink to the bottom so untagged ones stay in the work queue.
      if (isAdmin) {
        const aTagged = itemHasAssignedTags(a);
        const bTagged = itemHasAssignedTags(b);
        if (aTagged !== bTagged) return aTagged ? 1 : -1;
      }
      return compareByDateAsc(a, b);
    });
  }, [
    isAdmin,
    photos,
    tagOverrides,
    trip?.location,
    trip?.startDate,
    trip?.title,
    tripName,
  ]);

  const filteredItems = useMemo(() => {
    let next = items;
    if (mediaFilter === "photo") {
      next = next.filter((item) => item.type !== "video");
    } else if (mediaFilter === "video") {
      next = next.filter((item) => item.type === "video");
    }
    if (tagFilter) {
      next = next.filter((item) =>
        hasPhotoTag(item.tags ?? [], tagFilter),
      );
    }
    return next;
  }, [items, mediaFilter, tagFilter]);

  const mediaCounts = useMemo(() => {
    const base = tagFilter
      ? items.filter((item) => hasPhotoTag(item.tags ?? [], tagFilter))
      : items;
    let photo = 0;
    let video = 0;
    for (const item of base) {
      if (item.type === "video") video++;
      else photo++;
    }
    return { all: photo + video, photo, video };
  }, [items, tagFilter]);

  useEffect(() => {
    setSelectedId(null);
  }, [mediaFilter, tagFilter]);

  // If current media filter has no items left (e.g. last video deleted), fall back to All.
  useEffect(() => {
    if (mediaFilter === "all") return;
    if (filteredItems.length > 0) return;
    if (items.length > 0 && !tagFilter) setMediaFilter("all");
  }, [filteredItems.length, items.length, mediaFilter, setMediaFilter, tagFilter]);

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

  const handleToggleTag = useCallback(
    async (item: GalleryItem) => {
      if (!activeTag || taggingBusyId) return;

      const removing = hasPhotoTag(item.tags ?? [], activeTag);
      const currentTags = item.tags ?? [];
      const nextTags = removing
        ? currentTags.filter(
            (tag) => tag.toLowerCase() !== activeTag.toLowerCase(),
          )
        : [...currentTags, activeTag];

      setTaggingBusyId(String(item.id));
      setTagOverrides((prev) => {
        const next = new Map(prev);
        next.set(item.path, nextTags);
        return next;
      });

      try {
        const res = await fetch("/api/photos/update", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            path: item.path,
            sha: item.sha,
            trip: tripName,
            ...(removing ? { removeTag: activeTag } : { addTag: activeTag }),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to update tag");

        patchCachedTripPhoto(tripName, item.path, { tags: nextTags });
        invalidateGalleryHomeCache();
        refreshGallery();
        onPhotoChanged?.();
      } catch (err) {
        setTagOverrides((prev) => {
          const next = new Map(prev);
          next.set(item.path, currentTags);
          return next;
        });
        alert(err instanceof Error ? err.message : "Failed to update tag");
      } finally {
        setTaggingBusyId(null);
      }
    },
    [activeTag, onPhotoChanged, taggingBusyId, tripName],
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

  return (
    <div className="space-y-4">
      <GalleryGridControls
        filter={mediaFilter}
        onFilterChange={setMediaFilter}
        mediaCounts={mediaCounts}
        filterExtras={
          tagOptions.length > 0 && onTagFilterChange ? (
            <TripTagFilter
              tags={tagOptions}
              value={tagFilter}
              onChange={onTagFilterChange}
            />
          ) : null
        }
        tagsVisible={tagsVisible}
        onTagsVisibleChange={setTagsVisible}
      />

      {isAdmin ? (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setTaggingMode((on) => {
                if (on) setActiveTag(null);
                return !on;
              });
            }}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium uppercase tracking-[0.15em] transition",
              taggingMode
                ? "border-amber-500 bg-amber-500 text-white hover:bg-amber-600 dark:border-amber-400 dark:bg-amber-400 dark:text-stone-950"
                : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800",
            )}
          >
            <Tags className="h-3.5 w-3.5" />
            {taggingMode ? "Tagging on" : "Tag"}
          </button>
        </div>
      ) : null}

      {isAdmin && taggingMode ? (
        <div className="sticky top-28 z-20 space-y-3 rounded-2xl border border-zinc-200/80 bg-white/95 p-4 shadow-sm backdrop-blur dark:border-zinc-700 dark:bg-zinc-950/95">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
            {activeTag
              ? `Click images to toggle #${formatTagLabel(activeTag)}`
              : "Pick a tag, then click images to apply it"}
          </p>
          <div className="space-y-3">
            {PRESET_PHOTO_TAG_SECTIONS.map((section) => (
              <div key={section.label}>
                <h4 className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">
                  {section.label}
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {section.tags.map((tag) => {
                    const active = activeTag?.toLowerCase() === tag.toLowerCase();
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() =>
                          setActiveTag(active ? null : tag)
                        }
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-[11px] font-medium transition",
                          getPresetTagColorClasses(tag),
                          active &&
                            "ring-2 ring-amber-400 ring-offset-1 ring-offset-white dark:ring-offset-zinc-950",
                        )}
                      >
                        {formatTagLabel(tag)}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-zinc-400">
          <p className="text-sm">
            {tagFilter
              ? `No ${mediaFilter === "video" ? "videos" : mediaFilter === "photo" ? "photos" : "items"} tagged #${formatTagLabel(tagFilter)}`
              : mediaFilter === "video"
                ? "No videos in this trip"
                : mediaFilter === "photo"
                  ? "No photos in this trip"
                  : (emptyMessage ?? "No media found")}
          </p>
        </div>
      ) : (
        <LightGalleryAlbum
          className={cn(
            "vc-lg-album-ordered",
            isAdmin && "vc-lg-album-uniform",
          )}
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
          onPhotoChanged={onPhotoChanged}
          taggingMode={taggingMode}
          activeTag={activeTag}
          onToggleTag={(item) => void handleToggleTag(item)}
          taggingBusyId={taggingBusyId}
          showTags={tagsVisible}
        />
      )}
    </div>
  );
}
