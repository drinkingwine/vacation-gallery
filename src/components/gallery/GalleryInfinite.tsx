"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { BackToTop } from "@/components/gallery/BackToTop";
import { GallerySkeleton } from "@/components/gallery/GallerySkeleton";
import { Spinner } from "@/components/gallery/Spinner";
import { galleryCopy } from "@/lib/gallery-copy";
import type { GalleryItem } from "@/lib/gallery";

const Gallery25 = dynamic(
  () =>
    import("@/components/gallery/Gallery25").then((mod) => ({
      default: mod.Gallery25,
    })),
  {
    ssr: false,
    loading: () => <GallerySkeleton />,
  },
);

type GalleryResponse = {
  items: GalleryItem[];
  hasNext: boolean;
  page: number;
};

type GalleryInfiniteProps = {
  initialItems: GalleryItem[];
  hasNext: boolean;
  initialPage: number;
  pageSize: number;
  mediaType?: string;
  sortOrder?: string;
  keyword?: string;
  selectedId?: string | null;
  onSelectedIdChange?: (id: string | number | null) => void;
};

export function GalleryInfinite({
  initialItems,
  hasNext: initialHasNext,
  initialPage,
  pageSize,
  mediaType = "all",
  sortOrder = "newest",
  keyword = "",
  selectedId,
  onSelectedIdChange,
}: GalleryInfiniteProps) {
  const [items, setItems] = useState<GalleryItem[]>(initialItems);
  const [page, setPage] = useState(initialPage);
  const [hasNext, setHasNext] = useState(initialHasNext);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setItems(initialItems);
    setPage(initialPage);
    setHasNext(initialHasNext);
    setLoadError(false);
  }, [initialItems, initialPage, initialHasNext, mediaType, sortOrder, keyword]);

  const loadMore = useCallback(async () => {
    if (isLoading || !hasNext) return;
    setIsLoading(true);
    setLoadError(false);

    const nextPage = page + 1;
    const params = new URLSearchParams({
      page: String(nextPage),
      pageSize: String(pageSize),
      mediaType,
      sortOrder,
    });
    if (keyword) params.set("q", keyword);

    try {
      const response = await fetch(`/api/gallery?${params.toString()}`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Failed to load next page");
      const data = (await response.json()) as GalleryResponse;
      setItems((prev) => [...prev, ...data.items]);
      setPage(data.page);
      setHasNext(data.hasNext);
    } catch {
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }, [hasNext, isLoading, keyword, mediaType, page, pageSize, sortOrder]);

  useEffect(() => {
    if (!hasNext || loadError) return;
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "200px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNext, loadError, loadMore]);

  const handleItemTagsChange = useCallback((itemId: string, tags: string[]) => {
    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, tags } : item)),
    );
  }, []);

  return (
    <>
      <Gallery25
        items={items}
        selectedId={selectedId ?? null}
        onSelectedIdChange={onSelectedIdChange}
        onItemTagsChange={handleItemTagsChange}
      />

      <div className="mt-10 flex flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
        {loadError ? (
          <>
            <p className="text-rose-600 dark:text-rose-400">
              {galleryCopy.loadError}
            </p>
            <Button type="button" variant="outline" size="sm" onClick={loadMore}>
              {galleryCopy.retryLoad}
            </Button>
          </>
        ) : hasNext ? (
          <div className="inline-flex items-center gap-2">
            {isLoading ? <Spinner size="sm" /> : null}
            <span>
              {isLoading ? galleryCopy.loadingMore : galleryCopy.scrollMore}
            </span>
          </div>
        ) : (
          <span>{galleryCopy.allLoaded}</span>
        )}
      </div>

      <div ref={sentinelRef} className="h-6" />
      <BackToTop label={galleryCopy.backToTop} />
    </>
  );
}
