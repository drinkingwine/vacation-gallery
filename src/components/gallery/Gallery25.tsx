"use client";

import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useConfirm } from "@/components/ConfirmProvider";
import { BlurImage } from "@/components/gallery/BlurImage";
import { GalleryGridControls, type GalleryGridMediaFilter } from "@/components/gallery/GalleryGridControls";
import { GalleryHeader } from "@/components/gallery/GalleryHeader";
import { LightGalleryViewer } from "@/components/gallery/LightGalleryViewer";
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
import {
  getItemDisplayTags,
  itemHasAssignedTags,
  toLightGalleryElements,
} from "@/lib/gallery";
import { cn } from "@/lib/utils";

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
  filterExtras?: ReactNode;
};

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
  onItemTagsChange: _onItemTagsChange,
  clickToEdit = false,
  allowCardDelete = false,
  showTimestamp = false,
  tripTitle = null,
  showUntaggedFilter = false,
  filterExtras,
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
      return false;
    },
    [coverPhoto],
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
  const [filter, setFilter] = useState<GalleryGridMediaFilter>("all");
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

  const gridMediaCounts = useMemo(() => {
    const base = effectiveUntaggedOnly
      ? items.filter((item) => !itemHasAssignedTags(item))
      : items;
    let photo = 0;
    let video = 0;
    for (const item of base) {
      if (item.type === "video") video++;
      else photo++;
    }
    return { all: photo + video, photo, video };
  }, [effectiveUntaggedOnly, items]);

  const gridSummaryLabel = useMemo(() => {
    if (!tripTitle) return undefined;
    if (filter === "video") {
      const count = visibleItems.length;
      const mediaLabel = count === 1 ? "Video" : "Videos";
      return galleryCopy.grid.tripSummary(count, tripTitle, mediaLabel);
    }

    const count = visibleItems.length;
    const mediaLabel = count === 1 ? "Image" : "Images";
    return galleryCopy.grid.tripSummary(count, tripTitle, mediaLabel);
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

  const lightGalleryElements = useMemo(
    () => toLightGalleryElements(modalVisibleItems),
    [modalVisibleItems],
  );

  const lightGalleryOpenIndex =
    modalSelectedIndex >= 0 ? modalSelectedIndex : null;

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

  const handleLightGallerySlide = useCallback(
    (index: number) => {
      const nextId = modalVisibleItems[index]?.id ?? null;
      if (nextId !== null) setSelectedId(nextId);
    },
    [modalVisibleItems, setSelectedId],
  );

  if (!showGrid) {
    return (
      <LightGalleryViewer
        elements={lightGalleryElements}
        openIndex={lightGalleryOpenIndex}
        onClose={() => setSelectedId(null)}
        onSlideChange={handleLightGallerySlide}
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
          <GalleryGridControls
            filter={filter}
            onFilterChange={setFilter}
            summaryLabel={gridSummaryLabel}
            mediaCounts={gridMediaCounts}
            filterExtras={filterExtras}
            showMediaFilters={chromeVisible}
            columnCount={columnCount}
            onColumnCountChange={(value) =>
              setColumnCount(clampColumnCount(value, columnSliderMax))
            }
            columnSliderMax={columnSliderMax}
            displayColumnCount={displayColumnCount}
            tagsVisible={tagsVisible}
            onTagsVisibleChange={setTagsVisible}
            downloadsVisible={downloadsVisible}
            onDownloadsVisibleChange={setDownloadsVisible}
            timestampsVisible={timestampsVisible}
            onTimestampsVisibleChange={setTimestampsVisible}
            showUntaggedFilter={showUntaggedFilter}
            untaggedOnly={untaggedOnly}
            onUntaggedOnlyChange={setUntaggedOnly}
            sticky={isFullBleed}
          />
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
      <LightGalleryViewer
        elements={lightGalleryElements}
        openIndex={lightGalleryOpenIndex}
        onClose={() => setSelectedId(null)}
        onSlideChange={handleLightGallerySlide}
      />
    </section>
  );
}
