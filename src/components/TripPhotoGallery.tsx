"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { CheckSquare, MapPin, Tags } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { useConfirm } from "@/components/ConfirmProvider";
import { GeoLocator, type GeoLocatorResult } from "@/components/GeoLocator";
import {
  GalleryGridControls,
  type GalleryGridMediaFilter,
} from "@/components/gallery/GalleryGridControls";
import {
  TripTagFilter,
  type TripTagOption,
} from "@/components/TripTagFilter";
import { useViewportWidth } from "@/hooks/use-viewport-width";
import { invalidateGalleryHomeCache } from "@/lib/gallery-home-cache";
import { requestGalleryPhotoEdit, refreshGallery } from "@/lib/gallery-admin";
import { galleryVideoWatchPath } from "@/lib/edit-paths";
import { buildGalleryItem, itemHasAssignedTags } from "@/lib/gallery";
import type { GalleryItem } from "@/lib/gallery";
import { galleryCopy } from "@/lib/gallery-copy";
import { downloadGalleryItemsAsZip } from "@/lib/gallery-download";
import { parsePhotoTimestamp } from "@/lib/photo-timestamp";
import {
  formatTagLabel,
  getPresetTagColorClasses,
  hasPhotoTag,
  PRESET_PHOTO_TAG_SECTIONS,
} from "@/lib/photo-tags";
import {
  locationsFromTripPhotos,
  mergeRecentLocations,
  readRecentLocations,
  recentLocationKey,
  recentLocationMatches,
  rememberRecentLocation,
  type RecentLocation,
} from "@/lib/recent-locations";
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

const COLUMN_STORAGE_KEY = "trip-album-columns";

const clampColumnCount = (value: number, max = 10) =>
  Math.min(max, Math.max(2, value));

const getColumnSliderMax = (width: number) => {
  if (width >= 1024) return 10;
  if (width >= 640) return 6;
  return 4;
};

const readStoredColumnCount = () => {
  if (typeof window === "undefined") return 4;
  const stored = window.localStorage.getItem(COLUMN_STORAGE_KEY);
  if (!stored) return 4;
  const parsed = Number(stored);
  if (Number.isNaN(parsed)) return 4;
  return clampColumnCount(parsed, 10);
};

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
  const confirm = useConfirm();
  const router = useRouter();
  const viewportWidth = useViewportWidth();
  const [selectedId, setSelectedId] = useState<string | number | null>(null);
  const [internalMediaFilter, setInternalMediaFilter] =
    useState<GalleryGridMediaFilter>("all");
  const [taggingMode, setTaggingMode] = useState(false);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(
    () => new Set(),
  );
  const [pendingTag, setPendingTag] = useState<string | null>(null);
  const [pendingLocation, setPendingLocation] =
    useState<GeoLocatorResult | null>(null);
  const [bulkApplying, setBulkApplying] = useState(false);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [downloadAllProgress, setDownloadAllProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);
  const [storedRecentLocations, setStoredRecentLocations] = useState<
    RecentLocation[]
  >([]);
  const [tagOverrides, setTagOverrides] = useState<Map<string, string[]>>(
    () => new Map(),
  );
  const [taggingBusyId, setTaggingBusyId] = useState<string | null>(null);
  const [tagsVisible, setTagsVisible] = useState(false);
  const [downloadsVisible, setDownloadsVisible] = useState(false);
  const [columnCount, setColumnCount] = useState(4);

  const mediaFilter = mediaFilterProp ?? internalMediaFilter;
  const setMediaFilter = onMediaFilterChange ?? setInternalMediaFilter;

  const columnSliderMax = getColumnSliderMax(viewportWidth || 1024);

  useEffect(() => {
    setColumnCount(readStoredColumnCount());
  }, []);

  const handleColumnCountChange = useCallback(
    (value: number) => {
      const next = clampColumnCount(value, columnSliderMax);
      setColumnCount(next);
      window.localStorage.setItem(COLUMN_STORAGE_KEY, String(next));
    },
    [columnSliderMax],
  );

  useEffect(() => {
    setTagOverrides(new Map());
  }, [photos]);

  useEffect(() => {
    if (!isAdmin && taggingMode) {
      setTaggingMode(false);
      setActiveTag(null);
    }
    if (!isAdmin && selectMode) {
      setSelectMode(false);
      setSelectedPaths(new Set());
      setPendingTag(null);
      setPendingLocation(null);
    }
  }, [isAdmin, selectMode, taggingMode]);

  useEffect(() => {
    if (!selectMode) return;
    setStoredRecentLocations(readRecentLocations(tripName));
  }, [selectMode, tripName, photos]);

  const recentLocations = useMemo(
    () =>
      mergeRecentLocations(
        storedRecentLocations,
        locationsFromTripPhotos(photos, trip),
      ),
    [photos, storedRecentLocations, trip],
  );

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

  const downloadablePhotos = useMemo(
    () => filteredItems.filter((item) => item.type !== "video"),
    [filteredItems],
  );

  const handleDownloadAll = useCallback(async () => {
    if (downloadingAll) return;
    if (downloadablePhotos.length === 0) {
      alert(galleryCopy.grid.downloads.allEmpty);
      return;
    }

    const affirmed = await confirm({
      title: galleryCopy.grid.downloads.allConfirmTitle,
      message: galleryCopy.grid.downloads.allConfirm(downloadablePhotos.length),
      confirmLabel: galleryCopy.grid.downloads.allConfirmLabel,
      cancelLabel: "Cancel",
      destructive: false,
    });
    if (!affirmed) return;

    setDownloadingAll(true);
    setDownloadAllProgress({ done: 0, total: downloadablePhotos.length });
    try {
      const result = await downloadGalleryItemsAsZip(downloadablePhotos, {
        zipName: trip?.title || tripName || "photos",
        onProgress: (done, total) => setDownloadAllProgress({ done, total }),
      });
      if (result.failureCount > 0) {
        alert(
          galleryCopy.grid.downloads.allPartial(
            result.successCount,
            result.failureCount,
          ),
        );
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Download failed");
    } finally {
      setDownloadingAll(false);
      setDownloadAllProgress(null);
    }
  }, [
    confirm,
    downloadablePhotos,
    downloadingAll,
    trip?.title,
    tripName,
  ]);

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

  const displayColumnCount = Math.min(
    columnCount,
    columnSliderMax,
    Math.max(1, filteredItems.length || 1),
  );

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

  const clearBulkSelection = useCallback(() => {
    setSelectedPaths(new Set());
    setPendingTag(null);
    setPendingLocation(null);
  }, []);

  const handleToggleSelect = useCallback((item: GalleryItem) => {
    setSelectedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(item.path)) next.delete(item.path);
      else next.add(item.path);
      return next;
    });
  }, []);

  const handleSelectAllVisible = useCallback(() => {
    setSelectedPaths(new Set(filteredItems.map((item) => item.path)));
  }, [filteredItems]);

  const handleBulkApply = useCallback(async () => {
    if (bulkApplying || selectedPaths.size === 0) return;
    if (!pendingTag && !pendingLocation) {
      alert("Choose a tag and/or a location to apply.");
      return;
    }

    const paths = Array.from(selectedPaths);
    setBulkApplying(true);

    const previousTagOverrides = new Map(tagOverrides);
    if (pendingTag) {
      setTagOverrides((prev) => {
        const next = new Map(prev);
        for (const path of paths) {
          const photo = photos.find((entry) => entry.path === path);
          const current =
            next.get(path) ?? photo?.tags ?? [];
          if (!hasPhotoTag(current, pendingTag)) {
            next.set(path, [...current, pendingTag]);
          }
        }
        return next;
      });
    }

    try {
      const res = await fetch("/api/photos/bulk-update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trip: tripName,
          paths,
          ...(pendingTag ? { addTag: pendingTag } : {}),
          ...(pendingLocation
            ? {
                location: pendingLocation.location,
                latitude: pendingLocation.latitude,
                longitude: pendingLocation.longitude,
              }
            : {}),
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Bulk update failed");

      for (const path of paths) {
        const photo = photos.find((entry) => entry.path === path);
        const currentTags = photo?.tags ?? [];
        const nextTags =
          pendingTag && !hasPhotoTag(currentTags, pendingTag)
            ? [...currentTags, pendingTag]
            : currentTags;
        patchCachedTripPhoto(tripName, path, {
          ...(pendingTag ? { tags: nextTags } : {}),
          ...(pendingLocation
            ? {
                location: pendingLocation.location,
                latitude: pendingLocation.latitude,
                longitude: pendingLocation.longitude,
              }
            : {}),
        });
      }

      if (pendingLocation) {
        setStoredRecentLocations(
          rememberRecentLocation(tripName, pendingLocation),
        );
      }

      invalidateGalleryHomeCache();
      refreshGallery();
      onPhotoChanged?.();
      clearBulkSelection();
    } catch (err) {
      setTagOverrides(previousTagOverrides);
      alert(err instanceof Error ? err.message : "Bulk update failed");
    } finally {
      setBulkApplying(false);
    }
  }, [
    bulkApplying,
    clearBulkSelection,
    onPhotoChanged,
    pendingLocation,
    pendingTag,
    photos,
    selectedPaths,
    tagOverrides,
    tripName,
  ]);

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
        downloadsVisible={downloadsVisible}
        onDownloadsVisibleChange={setDownloadsVisible}
        onDownloadAll={() => void handleDownloadAll()}
        downloadAllBusy={downloadingAll}
        downloadAllDisabled={downloadablePhotos.length === 0}
        downloadAllProgress={downloadAllProgress}
        columnCount={columnCount}
        onColumnCountChange={handleColumnCountChange}
        columnSliderMax={columnSliderMax}
        displayColumnCount={displayColumnCount}
      />

      {isAdmin ? (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setSelectMode((on) => {
                if (!on) {
                  setTaggingMode(false);
                  setActiveTag(null);
                } else {
                  clearBulkSelection();
                }
                return !on;
              });
            }}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium uppercase tracking-[0.15em] transition",
              selectMode
                ? "border-zinc-900 bg-zinc-900 text-white hover:bg-zinc-800 dark:border-white dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
                : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800",
            )}
          >
            <CheckSquare className="h-3.5 w-3.5" />
            {selectMode ? "Selecting" : "Select"}
          </button>
          <button
            type="button"
            onClick={() => {
              setTaggingMode((on) => {
                if (!on) {
                  setSelectMode(false);
                  clearBulkSelection();
                } else {
                  setActiveTag(null);
                }
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

      {isAdmin && selectMode ? (
        <div className="sticky top-28 z-20 space-y-4 rounded-2xl border border-zinc-200/80 bg-white/95 p-4 shadow-sm backdrop-blur dark:border-zinc-700 dark:bg-zinc-950/95">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
              {selectedPaths.size === 0
                ? "Click images to select"
                : `${selectedPaths.size} selected`}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleSelectAllVisible}
                disabled={filteredItems.length === 0 || bulkApplying}
                className="rounded-full border border-zinc-200 px-3 py-1.5 text-[11px] font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                Select all visible
              </button>
              <button
                type="button"
                onClick={clearBulkSelection}
                disabled={
                  (selectedPaths.size === 0 &&
                    !pendingTag &&
                    !pendingLocation) ||
                  bulkApplying
                }
                className="rounded-full border border-zinc-200 px-3 py-1.5 text-[11px] font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">
              Tag to add
            </h4>
            {PRESET_PHOTO_TAG_SECTIONS.map((section) => (
              <div key={section.label}>
                <h5 className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">
                  {section.label}
                </h5>
                <div className="flex flex-wrap gap-1.5">
                  {section.tags.map((tag) => {
                    const active =
                      pendingTag?.toLowerCase() === tag.toLowerCase();
                    return (
                      <button
                        key={tag}
                        type="button"
                        disabled={bulkApplying}
                        onClick={() =>
                          setPendingTag(active ? null : tag)
                        }
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-[11px] font-medium transition",
                          getPresetTagColorClasses(tag),
                          active &&
                            "ring-2 ring-zinc-900 ring-offset-1 ring-offset-white dark:ring-white dark:ring-offset-zinc-950",
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

          <div className="space-y-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
            <h4 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">
              Location
            </h4>
            {recentLocations.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {recentLocations.map((entry) => {
                  const active = pendingLocation
                    ? recentLocationMatches(
                        entry,
                        pendingLocation.latitude,
                        pendingLocation.longitude,
                        pendingLocation.location,
                      )
                    : false;
                  const label =
                    entry.location ||
                    entry.geoLocation ||
                    `${entry.latitude.toFixed(5)}, ${entry.longitude.toFixed(5)}`;
                  return (
                    <button
                      key={recentLocationKey(entry)}
                      type="button"
                      disabled={bulkApplying}
                      onClick={() =>
                        setPendingLocation(
                          active
                            ? null
                            : {
                                location: entry.location,
                                geoLocation: entry.geoLocation,
                                latitude: entry.latitude,
                                longitude: entry.longitude,
                              },
                        )
                      }
                      className={cn(
                        "inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-left text-[11px] transition",
                        active
                          ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900"
                          : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-zinc-300 hover:bg-white dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:border-zinc-600 dark:hover:bg-zinc-900",
                      )}
                    >
                      <MapPin className="h-3 w-3 shrink-0 opacity-70" />
                      <span className="truncate">{label}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                No recent trip locations yet — look one up below.
              </p>
            )}

            <GeoLocator
              tripName={tripName}
              selected={pendingLocation}
              onLocated={(result) => {
                setPendingLocation(result);
                setStoredRecentLocations(
                  rememberRecentLocation(tripName, result),
                );
              }}
              onSelect={(result) => {
                setPendingLocation(result);
                setStoredRecentLocations(
                  rememberRecentLocation(tripName, result),
                );
              }}
              description="Search a place, then use it as the bulk location for the selected photos."
            />
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => {
                setSelectMode(false);
                clearBulkSelection();
              }}
              disabled={bulkApplying}
              className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleBulkApply()}
              disabled={
                bulkApplying ||
                selectedPaths.size === 0 ||
                (!pendingTag && !pendingLocation)
              }
              className="rounded-full bg-zinc-900 px-4 py-2 text-xs font-medium text-white transition hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
            >
              {bulkApplying
                ? "Applying…"
                : `Apply to ${selectedPaths.size || 0}`}
            </button>
          </div>
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
          columnCount={displayColumnCount}
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
          selectMode={selectMode}
          selectedPaths={selectedPaths}
          onToggleSelect={handleToggleSelect}
          showTags={tagsVisible}
          showDownloads={downloadsVisible}
        />
      )}
    </div>
  );
}
