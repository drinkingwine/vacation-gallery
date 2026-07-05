"use client";

import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { BlurImage } from "@/components/gallery/BlurImage";
import { GalleryHeader } from "@/components/gallery/GalleryHeader";
import { useViewportWidth } from "@/hooks/use-viewport-width";
import { getResponsiveColumnCount } from "@/lib/responsive";
import { requestGalleryPhotoEdit } from "@/lib/gallery-admin";
import { galleryCopy } from "@/lib/gallery-copy";
import type { GalleryItem } from "@/lib/gallery";
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
  className?: string;
  showChrome?: boolean;
  showGrid?: boolean;
  showHeader?: boolean;
  selectedId?: GalleryId | null;
  onSelectedIdChange?: (id: GalleryId | null) => void;
  coverPhoto?: string | null;
  coverUrl?: string | null;
  onMakeDefault?: (item: GalleryItem) => void;
};

const filters = [
  { value: "all", key: "all" },
  { value: "photo", key: "photo" },
  { value: "video", key: "video" },
  { value: "timeline", key: "timeline" },
] as const;

type FilterValue = (typeof filters)[number]["value"];

const clampColumnCount = (value: number, max = 10) =>
  Math.min(max, Math.max(2, value));

const getColumnSliderMax = (width: number) => {
  if (width >= 1024) return getResponsiveColumnCount(width);
  if (width >= 640) return 4;
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

const resolveTimelineTimestamp = (item: GalleryItem) => {
  const value = item.dateShot ?? item.createdAt;
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  if (Number.isNaN(parsed)) return 0;
  return parsed;
};

export function Gallery25({
  items = [],
  className,
  showChrome = true,
  showGrid = true,
  showHeader = true,
  selectedId: controlledSelectedId,
  onSelectedIdChange,
  coverPhoto = null,
  coverUrl = null,
  onMakeDefault,
}: Gallery25Props) {
  const { isAdmin } = useAuth();
  const viewportWidth = useViewportWidth();

  const handlePhotoEdit = useCallback((item: GalleryItem) => {
    const returnTo =
      typeof window !== "undefined"
        ? `${window.location.pathname}${window.location.search}`
        : undefined;
    requestGalleryPhotoEdit(item, returnTo);
  }, []);

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
  const [isFullBleed, setIsFullBleed] = useState(false);
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

  const gridRef = useRef<HTMLDivElement | null>(null);
  const previousFullBleed = useRef(isFullBleed);
  const lastScrollY = useRef(0);

  const timelineItems = useMemo(
    () =>
      items
        .map((item, index) => ({ item, index }))
        .sort((a, b) => {
          const timeA = resolveTimelineTimestamp(a.item);
          const timeB = resolveTimelineTimestamp(b.item);
          if (timeA === timeB) return a.index - b.index;
          return timeB - timeA;
        })
        .map((entry) => entry.item),
    [items],
  );

  const visibleItems = useMemo(() => {
    if (filter === "timeline") return timelineItems;
    if (filter === "all") return items;
    if (filter === "video") return [];
    return items.filter((item) => item.type === filter);
  }, [filter, items, timelineItems]);

  const columnSliderMax = getColumnSliderMax(viewportWidth);
  const usesResponsiveColumns = viewportWidth >= 1024;
  const responsiveColumnCount = getResponsiveColumnCount(viewportWidth);
  const targetColumnCount = usesResponsiveColumns
    ? responsiveColumnCount
    : columnCount;
  const displayColumnCount = usesResponsiveColumns
    ? responsiveColumnCount
    : Math.min(
        targetColumnCount,
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
  const selectedIndex = useMemo(() => {
    if (!selectedId) return -1;
    return visibleItems.findIndex((item) => item.id === selectedId);
  }, [selectedId, visibleItems]);
  const selected = useMemo(() => {
    if (!selectedId) return null;
    return visibleItems.find((item) => item.id === selectedId) ?? null;
  }, [selectedId, visibleItems]);

  const chromeVisible = showChrome && (!isFullBleed || isChromeVisible);
  const gridControlsVisible = showChrome;

  useEffect(() => {
    window.localStorage.setItem("gallery25-columns", String(columnCount));
  }, [columnCount]);

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
    if (!selected) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedId(null);
        return;
      }
      if (visibleItems.length < 2) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        const prevIndex =
          selectedIndex <= 0 ? visibleItems.length - 1 : selectedIndex - 1;
        setSelectedId(visibleItems[prevIndex]?.id ?? null);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        const nextIndex =
          selectedIndex >= visibleItems.length - 1 ? 0 : selectedIndex + 1;
        setSelectedId(visibleItems[nextIndex]?.id ?? null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selected, selectedIndex, setSelectedId, visibleItems]);

  useEffect(() => {
    if (selected) {
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
  }, [selected]);

  const canNavigate = visibleItems.length > 1 && selectedIndex !== -1;
  const handleNavigate = (direction: "prev" | "next") => {
    if (!canNavigate) return;
    const nextIndex =
      direction === "prev"
        ? selectedIndex <= 0
          ? visibleItems.length - 1
          : selectedIndex - 1
        : selectedIndex >= visibleItems.length - 1
          ? 0
          : selectedIndex + 1;
    setSelectedId(visibleItems[nextIndex]?.id ?? null);
  };

  if (!showGrid) {
    return (
      <PhotoDetailModal
        selectedItem={selected}
        items={visibleItems}
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
                {galleryCopy.grid.summary(visibleItems.length, items.length)}
              </span>
              <label
                className={cn(
                  "flex min-w-[10rem] flex-1 items-center gap-2 text-xs text-muted-foreground sm:min-w-0 sm:flex-none",
                  usesResponsiveColumns && "flex-none",
                )}
              >
                <span className="shrink-0">{galleryCopy.grid.columns.label}</span>
                {usesResponsiveColumns ? (
                  <span className="shrink-0 tabular-nums">
                    {galleryCopy.grid.columns.count(displayColumnCount)}
                  </span>
                ) : (
                  <>
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
                  </>
                )}
              </label>
              <button
                type="button"
                onClick={() => {
                  const next = !isFullBleed;
                  setIsFullBleed(next);
                  if (!next) {
                    setIsChromeVisible(true);
                  }
                }}
                className="shrink-0 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition hover:text-foreground"
              >
                {isFullBleed
                  ? galleryCopy.grid.fullBleed.off
                  : galleryCopy.grid.fullBleed.on}
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
                  const itemTags = (item.tags ?? []).slice(0, 3);

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
                        onClick={() => setSelectedId(item.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setSelectedId(item.id);
                          }
                        }}
                        className="block w-full cursor-pointer text-left outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                      >
                        <div
                          className="relative w-full"
                          style={{
                            aspectRatio: getAspectRatioValue(item, ratioMap),
                          }}
                        >
                          <BlurImage
                            fill
                            sizes={gridSizes}
                            quality={85}
                            priority={itemIndex < 4 && columnIndex < 2}
                            className="object-cover transition duration-300 group-hover:scale-105"
                            src={item.src}
                            alt={item.title}
                            blurHash={item.blurHash}
                            onLoadingComplete={(image) => {
                              const ratioKey = getRatioKey(item.id);
                              if (ratioMap[ratioKey]) return;
                              if (!image.naturalWidth || !image.naturalHeight)
                                return;
                              setRatioMap((prev) => ({
                                ...prev,
                                [ratioKey]:
                                  image.naturalWidth / image.naturalHeight,
                              }));
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100" />
                          <div className="absolute inset-x-0 bottom-0 px-4 pb-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
                            <p className="truncate text-sm font-medium text-white">
                              {item.title}
                            </p>
                            {item.width && item.height ? (
                              <p className="text-xs text-white/60">
                                {item.width}×{item.height}
                              </p>
                            ) : null}
                            {itemTags.length > 0 ? (
                              <div className="mt-1 flex flex-wrap gap-1.5">
                                {itemTags.map((tag) => (
                                  <span
                                    key={tag}
                                    className="rounded-full border border-white/30 bg-black/35 px-2 py-0.5 text-[10px] text-white/85 backdrop-blur-sm"
                                  >
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </motion.article>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
      <PhotoDetailModal
        selectedItem={selected}
        items={visibleItems}
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
      />
    </section>
  );
}
