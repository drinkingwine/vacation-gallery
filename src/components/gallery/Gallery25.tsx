"use client";

import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useConfirm } from "@/components/ConfirmProvider";
import { BlurImage } from "@/components/gallery/BlurImage";
import { GalleryHeader } from "@/components/gallery/GalleryHeader";
import { useViewportWidth } from "@/hooks/use-viewport-width";
import { requestGalleryPhotoEdit } from "@/lib/gallery-admin";
import {
  DefaultPhotoBadge,
  DeleteIconButton,
  DownloadIconButton,
  PhotoCardEditDeleteBar,
  PhotoCardToolbar,
  PhotoTagBadges,
  PhotoTagOverlay,
  PhotoTimestampOverlay,
  VideoTypeBadge,
} from "@/components/gallery/PhotoOverlayIcons";
import { galleryCopy } from "@/lib/gallery-copy";
import { downloadGalleryItem } from "@/lib/gallery-download";
import type { GalleryItem } from "@/lib/gallery";
import { getItemDisplayTags, itemHasAssignedTags } from "@/lib/gallery";
import { cn } from "@/lib/utils";

const PhotoDetailModal = dynamic(
  () =>
    import("@/components/gallery/PhotoDetailModal").then((mod) => ({
      default: mod.PhotoDetailModal,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-indigo-500" />
      </div>
    ),
  },
);

type GalleryId = string | number;

type Gallery25Props = {
  items?: GalleryItem[];
  viewerItems?: GalleryItem[];
  className?: string;
  showChrome?: boolean;
  showGrid?: boolean;
  showHeader?: boolean;
  selectedId?: GalleryId | null;
  onSelectedIdChange?: (id: GalleryId | null) => void;
  coverPhoto?: string | null;
  coverUrl?: string | null;
  onMakeDefault?: (item: GalleryItem) => void;
  onPhotoChanged?: () => void;
  onItemRemoved?: (itemId: string) => void;
  onItemTagsChange?: (itemId: string, tags: string[]) => void;
  clickToEdit?: boolean;
  allowCardDelete?: boolean;
  showTimestamp?: boolean;
  tripTitle?: string | null;
  showUntaggedFilter?: boolean;
};

const filters = [
  { value: "all", key: "all" },
  { value: "photo", key: "photo" },
  { value: "video", key: "video" },
] as const;

type FilterValue = (typeof filters)[number]["value"];

const clampColumnCount = (value: number, max = 10) =>
  Math.min(max, Math.max(2, value));

const getColumnSliderMax = (width: number) => {
  if (width >= 1024) return 10;
  if (width >= 640) return 6;
  return 4;
};

const readStoredNumber = (key: string, fallback: number) => {
  if (typeof window === "undefined") return fallback;
  const stored = window.localStorage.getItem(key);
  if (!stored) return fallback;
  const parsed = Number(stored);
  if (Number.isNaN(parsed)) return fallback;
  return clampColumnCount(parsed, 10);
};

const readStoredBoolean = (key: string, fallback = false) => {
  if (typeof window === "undefined") return fallback;
  const stored = window.localStorage.getItem(key);
  if (stored === "true") return true;
  if (stored === "false") return false;
  return fallback;
};

const UNTAGGED_ONLY_STORAGE = "gallery25-untagged-only";

const readStoredUntaggedOnly = () => {
  if (typeof window === "undefined") return false;
  const stored = window.localStorage.getItem(UNTAGGED_ONLY_STORAGE);
  if (stored === "true") return true;
  if (stored === "false") return false;
  const legacy = window.localStorage.getItem("gallery25-untagged-filter");
  return legacy === "untagged";
};

const createBalancedColumns = (
  items: GalleryItem[],
  columnCount: number,
  ratioMap: Record<string, number>,
) => {
  const columns = Array.from({ length: columnCount }, () => [] as GalleryItem[]);
  const columnHeights = Array.from({ length: columnCount }, () => 0);

  items.forEach((item) => {
    const ratio = getAspectRatioValue(item, ratioMap);
    const safeRatio = ratio > 0 ? ratio : 1;
    const estimatedHeight = 1 / safeRatio;
    const shortestIndex = columnHeights.indexOf(Math.min(...columnHeights));
    columns[shortestIndex].push(item);
    columnHeights[shortestIndex] += estimatedHeight;
  });
  return columns;
};

const getRatioKey = (id: GalleryId) => String(id);

const getAspectRatioValue = (
  item: GalleryItem,
  ratioMap: Record<string, number>,
) => {
  const ratioKey = getRatioKey(item.id);
  if (ratioMap[ratioKey]) return ratioMap[ratioKey];
  if (item.width && item.height) return item.width / item.height;
  return 4 / 3;
};

const getImageLayoutSize = (
  item: GalleryItem,
  ratioMap: Record<string, number>,
) => {
  const ratio = getAspectRatioValue(item, ratioMap);
  const width = item.width && item.width > 0 ? item.width : 1200;
  const height =
    item.height && item.height > 0
      ? item.height
      : Math.max(1, Math.round(width / ratio));
  return { width, height };
};

export function Gallery25({
  items = [],
  viewerItems,
  className,
  showChrome = true,
  showGrid = true,
  showHeader = true,
  selectedId: controlledSelectedId,
  onSelectedIdChange,
  coverPhoto = null,
  coverUrl = null,
  onMakeDefault,
  onPhotoChanged,
  onItemRemoved,
  onItemTagsChange,
  clickToEdit = false,
  allowCardDelete = false,
  showTimestamp = false,
  tripTitle = null,
  showUntaggedFilter = false,
}: Gallery25Props) {
  const { isAdmin } = useAuth();
  const confirm = useConfirm();
  const viewportWidth = useViewportWidth();
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [downloadingItemId, setDownloadingItemId] = useState<string | null>(null);

  const handlePhotoEdit = useCallback((item: GalleryItem) => {
    const returnTo =
      typeof window !== "undefined"
        ? `${window.location.pathname}${window.location.search}`
        : undefined;
    requestGalleryPhotoEdit(item, returnTo);
  }, []);

  const rememberItemAspectRatio = useCallback(
    (item: GalleryItem, width: number, height: number) => {
      if (!width || !height) return;
      const ratio = width / height;
      const ratioKey = getRatioKey(item.id);
      setRatioMap((prev) => {
        if (prev[ratioKey] === ratio) return prev;
        return { ...prev, [ratioKey]: ratio };
      });
    },
    [],
  );

  const isCoverPhoto = useCallback(
    (item: GalleryItem) => {
      if (coverPhoto) return item.filename === coverPhoto;
      if (coverUrl) return item.src === coverUrl;
      return false;
    },
    [coverPhoto, coverUrl],
  );
  const [uncontrolledSelectedId, setUncontrolledSelectedId] =
    useState<GalleryId | null>(null);
  const [isFullBleed] = useState(false);
  const [timestampsVisible, setTimestampsVisible] = useState(() =>
    readStoredBoolean("gallery25-timestamps-visible", showTimestamp),
  );
  const [tagsVisible, setTagsVisible] = useState(() =>
    readStoredBoolean("gallery25-tags-visible", false),
  );
  const [downloadsVisible, setDownloadsVisible] = useState(() =>
    readStoredBoolean("gallery25-downloads-visible", false),
  );
  const [untaggedOnly, setUntaggedOnly] = useState(() =>
    showUntaggedFilter ? readStoredUntaggedOnly() : false,
  );
  const effectiveUntaggedOnly = showUntaggedFilter && untaggedOnly;
  const [columnCount, setColumnCount] = useState(() =>
    readStoredNumber("gallery25-columns", 4),
  );
  const [filter, setFilter] = useState<FilterValue>("all");
  const [isChromeVisible, setIsChromeVisible] = useState(true);
  const [ratioMap, setRatioMap] = useState<Record<string, number>>({});

  const selectedId =
    controlledSelectedId === undefined
      ? uncontrolledSelectedId
      : controlledSelectedId;
  const setSelectedId = useCallback(
    (id: GalleryId | null) => {
      if (controlledSelectedId === undefined) setUncontrolledSelectedId(id);
      onSelectedIdChange?.(id);
    },
    [controlledSelectedId, onSelectedIdChange],
  );

  const handleDownloadItem = useCallback(async (item: GalleryItem) => {
    if (downloadingItemId) return;

    setDownloadingItemId(String(item.id));
    try {
      await downloadGalleryItem(item);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Download failed");
    } finally {
      setDownloadingItemId(null);
    }
  }, [downloadingItemId]);

  const handleDeleteItem = useCallback(
    async (item: GalleryItem) => {
      if (busyItemId) return;

      if (!clickToEdit) {
        const confirmed = await confirm({
          title: "Are you sure?",
          message: `Delete "${item.filename}"? This cannot be undone.`,
        });
        if (!confirmed) return;
      }

      setBusyItemId(String(item.id));
      try {
        const res = await fetch("/api/photos/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: item.path }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Delete failed");

        if (selectedId === item.id) setSelectedId(null);
        onItemRemoved?.(String(item.id));
        onPhotoChanged?.();
      } catch (err) {
        alert(err instanceof Error ? err.message : "Delete failed");
      } finally {
        setBusyItemId(null);
      }
    },
    [busyItemId, clickToEdit, confirm, onItemRemoved, onPhotoChanged, selectedId, setSelectedId],
  );

  const gridRef = useRef<HTMLDivElement | null>(null);
  const previousFullBleed = useRef(isFullBleed);
  const lastScrollY = useRef(0);

  const navigationItems = viewerItems ?? items;

  const visibleItems = useMemo(() => {
    let filtered = items;
    if (filter === "video") {
      filtered = items.filter((item) => item.type === "video");
    } else     if (filter !== "all") {
      filtered = items.filter((item) => item.type === filter);
    }
    return effectiveUntaggedOnly
      ? filtered.filter((item) => !itemHasAssignedTags(item))
      : filtered;
  }, [filter, effectiveUntaggedOnly, items]);

  const columnSliderMax = getColumnSliderMax(viewportWidth);
  const displayColumnCount = Math.min(
    columnCount,
    columnSliderMax,
    Math.max(1, visibleItems.length),
  );
  const gridSizes = `(max-width: 640px) 47vw, (max-width: 1024px) 33vw, ${Math.round(
    (isFullBleed ? 100 : 88) / displayColumnCount,
  )}vw`;
  const columns = useMemo(
    () => createBalancedColumns(visibleItems, displayColumnCount, ratioMap),
    [displayColumnCount, ratioMap, visibleItems],
  );

  const gridSummaryLabel = useMemo(() => {
    if (filter === "video") {
      const count = visibleItems.length;
      const mediaLabel = count === 1 ? "Video" : "Videos";
      return tripTitle
        ? galleryCopy.grid.tripSummary(count, tripTitle, mediaLabel)
        : galleryCopy.grid.summary(count);
    }

    const count = visibleItems.length;
    const mediaLabel = count === 1 ? "Image" : "Images";
    return tripTitle
      ? galleryCopy.grid.tripSummary(count, tripTitle, mediaLabel)
      : galleryCopy.grid.summary(count);
  }, [filter, tripTitle, visibleItems.length]);
  const modalVisibleItems = useMemo(() => {
    let filtered = navigationItems;
    if (filter === "video") {
      filtered = navigationItems.filter((item) => item.type === "video");
    } else     if (filter !== "all") {
      filtered = navigationItems.filter((item) => item.type === filter);
    }
    return effectiveUntaggedOnly
      ? filtered.filter((item) => !itemHasAssignedTags(item))
      : filtered;
  }, [filter, effectiveUntaggedOnly, navigationItems]);

  const modalSelectedIndex = useMemo(() => {
    if (!selectedId) return -1;
    return modalVisibleItems.findIndex(
      (item) => String(item.id) === String(selectedId),
    );
  }, [modalVisibleItems, selectedId]);

  const modalSelected = useMemo(() => {
    if (!selectedId) return null;
    return (
      modalVisibleItems.find((item) => String(item.id) === String(selectedId)) ??
      null
    );
  }, [modalVisibleItems, selectedId]);

  const chromeVisible = showChrome && (!isFullBleed || isChromeVisible);
  const gridControlsVisible = showChrome;

  useEffect(() => {
    window.localStorage.setItem("gallery25-columns", String(columnCount));
  }, [columnCount]);

  useEffect(() => {
    window.localStorage.setItem("gallery25-tags-visible", String(tagsVisible));
  }, [tagsVisible]);

  useEffect(() => {
    window.localStorage.setItem(
      "gallery25-downloads-visible",
      String(downloadsVisible),
    );
  }, [downloadsVisible]);

  useEffect(() => {
    if (!showUntaggedFilter) return;
    window.localStorage.setItem(UNTAGGED_ONLY_STORAGE, String(untaggedOnly));
  }, [showUntaggedFilter, untaggedOnly]);

  useEffect(() => {
    window.localStorage.setItem(
      "gallery25-timestamps-visible",
      String(timestampsVisible),
    );
  }, [timestampsVisible]);

  useEffect(() => {
    setColumnCount((current) => clampColumnCount(current, columnSliderMax));
  }, [columnSliderMax]);

  useEffect(() => {
    if (typeof window === "undefined" || !isFullBleed) return;
    let frame = 0;
    lastScrollY.current = window.scrollY;
    const onScroll = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const current = window.scrollY;
        const delta = current - lastScrollY.current;
        if (delta > 6) setIsChromeVisible(false);
        if (delta < -6) setIsChromeVisible(true);
        lastScrollY.current = current;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, [isFullBleed]);

  useEffect(() => {
    if (typeof window === "undefined" || !isFullBleed) return;
    const onWheel = (event: WheelEvent) => {
      if (window.scrollY > 0) return;
      if (event.deltaY >= 0) return;
      setIsChromeVisible(true);
    };
    window.addEventListener("wheel", onWheel, { passive: true });
    return () => window.removeEventListener("wheel", onWheel);
  }, [isFullBleed]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const shouldHide = isFullBleed && !isChromeVisible;
    document.body.classList.toggle("gallery-chrome-hidden", shouldHide);
    return () => document.body.classList.remove("gallery-chrome-hidden");
  }, [isFullBleed, isChromeVisible]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let timeout: number | undefined;
    if (isFullBleed && !previousFullBleed.current) {
      const node = gridRef.current;
      if (node) {
        timeout = window.setTimeout(() => {
          node.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 80);
      }
    }
    previousFullBleed.current = isFullBleed;
    return () => {
      if (timeout) window.clearTimeout(timeout);
    };
  }, [isFullBleed]);

  useEffect(() => {
    if (!modalSelected) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedId(null);
        return;
      }
      if (modalVisibleItems.length < 2) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        const prevIndex =
          modalSelectedIndex <= 0
            ? modalVisibleItems.length - 1
            : modalSelectedIndex - 1;
        setSelectedId(modalVisibleItems[prevIndex]?.id ?? null);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        const nextIndex =
          modalSelectedIndex >= modalVisibleItems.length - 1
            ? 0
            : modalSelectedIndex + 1;
        setSelectedId(modalVisibleItems[nextIndex]?.id ?? null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [modalSelected, modalSelectedIndex, modalVisibleItems, setSelectedId]);

  useEffect(() => {
    if (modalSelected) {
      document.body.style.overflow = "hidden";
      document.body.classList.add("gallery-modal-open");
    } else {
      document.body.style.overflow = "";
      document.body.classList.remove("gallery-modal-open");
    }
    return () => {
      document.body.style.overflow = "";
      document.body.classList.remove("gallery-modal-open");
    };
  }, [modalSelected]);

  const canNavigate =
    modalVisibleItems.length > 1 && modalSelectedIndex !== -1;
  const handleNavigate = (direction: "prev" | "next") => {
    if (!canNavigate) return;
    const nextIndex =
      direction === "prev"
        ? modalSelectedIndex <= 0
          ? modalVisibleItems.length - 1
          : modalSelectedIndex - 1
        : modalSelectedIndex >= modalVisibleItems.length - 1
          ? 0
          : modalSelectedIndex + 1;
    setSelectedId(modalVisibleItems[nextIndex]?.id ?? null);
  };

  if (!showGrid) {
    return (
      <PhotoDetailModal
        selectedItem={modalSelected}
        items={modalVisibleItems}
        onSelect={(id) => setSelectedId(id)}
        onClose={() => setSelectedId(null)}
        onPrev={() => handleNavigate("prev")}
        onNext={() => handleNavigate("next")}
        hasPrev={canNavigate}
        hasNext={canNavigate}
        isAdmin={isAdmin}
        onEdit={handlePhotoEdit}
        onMakeDefault={onMakeDefault}
        isCoverPhoto={isCoverPhoto}
        onPhotoChanged={onPhotoChanged}
        onItemTagsChange={onItemTagsChange}
      />
    );
  }

  return (
    <section
      className={cn(
        "pb-24",
        isFullBleed && "relative left-1/2 right-1/2 w-screen -translate-x-1/2",
        className,
      )}
    >
      <div
        className={cn(
          "relative space-y-8",
          isFullBleed ? "w-full px-4 md:px-6" : "w-full",
        )}
      >
        {chromeVisible && showHeader ? <GalleryHeader /> : null}

        {gridControlsVisible ? (
          <div
            className={cn(
              "flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white/85 p-3 shadow-sm backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-900/85 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4 sm:p-4",
              isFullBleed &&
                "sticky top-[calc(5.5rem+env(safe-area-inset-top))] z-30",
            )}
          >
            {chromeVisible ? (
              <div className="-mx-1 flex overflow-x-auto px-1 pb-1 sm:mx-0 sm:overflow-visible sm:pb-0">
                <div className="flex shrink-0 gap-1.5 rounded-full border border-zinc-200 bg-white px-1.5 py-1.5 text-sm shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:gap-2 sm:px-2 sm:py-2">
                  {filters.map((tab) => (
                    <button
                      key={tab.value}
                      type="button"
                      onClick={() => setFilter(tab.value)}
                      className={cn(
                        "shrink-0 rounded-full px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] transition sm:px-4 sm:py-2 sm:text-xs sm:tracking-[0.3em]",
                        filter === tab.value
                          ? "bg-zinc-100 text-zinc-900 dark:bg-white/10 dark:text-white"
                          : "text-zinc-600/80 hover:text-zinc-900 dark:text-white/60 dark:hover:text-white",
                      )}
                    >
                      {galleryCopy.filters[tab.key]}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="flex w-full flex-wrap items-center gap-3 text-sm text-muted-foreground sm:w-auto sm:justify-end">
              <span className="text-xs sm:text-sm">
                {gridSummaryLabel}
              </span>
              <label className="flex min-w-[10rem] flex-1 items-center gap-2 text-xs text-muted-foreground sm:min-w-0 sm:flex-none">
                <span className="shrink-0">{galleryCopy.grid.columns.label}</span>
                <input
                  type="range"
                  min={2}
                  max={columnSliderMax}
                  step={1}
                  value={Math.min(columnCount, columnSliderMax)}
                  onChange={(event) =>
                    setColumnCount(
                      clampColumnCount(
                        Number(event.target.value),
                        columnSliderMax,
                      ),
                    )
                  }
                  className="h-1 min-w-0 flex-1 cursor-pointer accent-primary sm:w-32 sm:flex-none"
                  aria-label={galleryCopy.grid.columns.aria}
                />
                <span className="shrink-0 tabular-nums">
                  {galleryCopy.grid.columns.count(displayColumnCount)}
                </span>
              </label>
              <button
                type="button"
                onClick={() => setTagsVisible((visible) => !visible)}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1 text-xs transition",
                  tagsVisible
                    ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {tagsVisible
                  ? galleryCopy.grid.tags.off
                  : galleryCopy.grid.tags.on}
              </button>
              {showUntaggedFilter ? (
                <button
                  type="button"
                  onClick={() => setUntaggedOnly((active) => !active)}
                  className={cn(
                    "shrink-0 rounded-full border px-3 py-1 text-xs transition",
                    untaggedOnly
                      ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900"
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  {untaggedOnly
                    ? galleryCopy.grid.untagged.all
                    : galleryCopy.grid.untagged.only}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setDownloadsVisible((visible) => !visible)}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1 text-xs transition",
                  downloadsVisible
                    ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {downloadsVisible
                  ? galleryCopy.grid.downloads.off
                  : galleryCopy.grid.downloads.on}
              </button>
              <button
                type="button"
                onClick={() => setTimestampsVisible((visible) => !visible)}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1 text-xs transition",
                  timestampsVisible
                    ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {timestampsVisible
                  ? galleryCopy.grid.timestamps.off
                  : galleryCopy.grid.timestamps.on}
              </button>
            </div>
          </div>
        ) : null}

        <div
          ref={gridRef}
          className={cn("flex gap-2 sm:gap-4", isFullBleed && "pt-4 md:pt-6")}
        >
          {columns.map((columnItems, columnIndex) => {
            const yOffset = columnIndex % 2 === 0 ? 40 : -40;

            return (
              <div key={columnIndex} className="flex min-w-0 flex-1 flex-col gap-4">
                {columnItems.map((item, itemIndex) => {
                  const isDefault = isCoverPhoto(item);
                  const isBusy = busyItemId === String(item.id);
                  const isDownloading = downloadingItemId === String(item.id);
                  const isVideo = item.type === "video";
                  const displayTags = getItemDisplayTags(item);
                  const showAdminToolbar = isAdmin && !clickToEdit;
                  const showFooterTags =
                    isAdmin && !clickToEdit && displayTags.length > 0 && !tagsVisible;
                  const showCardFooter = showAdminToolbar || showFooterTags;
                  const showTagOverlay = tagsVisible && displayTags.length > 0;
                  const imageLayout = getImageLayoutSize(item, ratioMap);

                  return (
                    <motion.article
                      key={item.id}
                      initial={{ opacity: 0, scale: 0.96, y: yOffset }}
                      whileInView={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ duration: 0.45, delay: itemIndex * 0.08 }}
                      className="group relative z-0 w-full overflow-hidden rounded-2xl border border-border bg-card"
                    >
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() =>
                          clickToEdit
                            ? handlePhotoEdit(item)
                            : setSelectedId(item.id)
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            if (clickToEdit) handlePhotoEdit(item);
                            else setSelectedId(item.id);
                          }
                        }}
                        className="block w-full cursor-pointer text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500"
                      >
                        <div className="relative w-full overflow-hidden">
                          {isVideo ? (
                            <video
                              src={item.src}
                              muted
                              playsInline
                              preload="metadata"
                              className="block h-auto w-full"
                              onLoadedMetadata={(event) => {
                                const video = event.currentTarget;
                                rememberItemAspectRatio(
                                  item,
                                  video.videoWidth,
                                  video.videoHeight,
                                );
                              }}
                            />
                          ) : (
                            <BlurImage
                              width={imageLayout.width}
                              height={imageLayout.height}
                              sizes={gridSizes}
                              quality={85}
                              priority={itemIndex < 4 && columnIndex < 2}
                              className="block h-auto w-full"
                              src={item.src}
                              alt={item.title}
                              blurHash={item.blurHash}
                              onImageLoad={(image) => {
                                rememberItemAspectRatio(
                                  item,
                                  image.naturalWidth,
                                  image.naturalHeight,
                                );
                              }}
                            />
                          )}
                          {isDefault ? (
                            <div className="pointer-events-none absolute left-2 top-2 z-10">
                              <DefaultPhotoBadge variant="overlay" />
                            </div>
                          ) : null}
                          {isVideo ? (
                            <div className="pointer-events-none absolute right-2 top-2 z-10">
                              <VideoTypeBadge variant="overlay" />
                            </div>
                          ) : null}
                          {isAdmin && clickToEdit && allowCardDelete ? (
                            <div className="absolute right-2 top-2 z-20">
                              <DeleteIconButton
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void handleDeleteItem(item);
                                }}
                                busy={isBusy}
                                disabled={isBusy}
                              />
                            </div>
                          ) : null}
                          {showTagOverlay ? (
                            <PhotoTagOverlay tags={displayTags} />
                          ) : null}
                          {timestampsVisible ? (
                            <PhotoTimestampOverlay dateTaken={item.dateTaken} />
                          ) : null}
                          {downloadsVisible ? (
                            <div className="absolute bottom-2 right-2 z-20">
                              <DownloadIconButton
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void handleDownloadItem(item);
                                }}
                                busy={isDownloading}
                                disabled={Boolean(downloadingItemId)}
                              />
                            </div>
                          ) : null}
                        </div>
                      </div>
                      {showCardFooter ? (
                        <>
                          {showAdminToolbar ? (
                            <PhotoCardToolbar centered>
                              <PhotoCardEditDeleteBar
                                onEdit={(e) => {
                                  e.stopPropagation();
                                  handlePhotoEdit(item);
                                }}
                                onDelete={(e) => {
                                  e.stopPropagation();
                                  void handleDeleteItem(item);
                                }}
                                editDisabled={isBusy}
                                deleteBusy={isBusy}
                              />
                            </PhotoCardToolbar>
                          ) : null}
                          {showFooterTags ? (
                            <PhotoTagBadges
                              tags={displayTags}
                              dividedFromToolbar={showAdminToolbar}
                            />
                          ) : null}
                        </>
                      ) : null}
                    </motion.article>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
      <PhotoDetailModal
        selectedItem={modalSelected}
        items={modalVisibleItems}
        onSelect={(id) => setSelectedId(id)}
        onClose={() => setSelectedId(null)}
        onPrev={() => handleNavigate("prev")}
        onNext={() => handleNavigate("next")}
        hasPrev={canNavigate}
        hasNext={canNavigate}
        isAdmin={isAdmin}
        onEdit={handlePhotoEdit}
        onMakeDefault={onMakeDefault}
        isCoverPhoto={isCoverPhoto}
        onPhotoChanged={onPhotoChanged}
        onItemTagsChange={onItemTagsChange}
      />
    </section>
  );
}
