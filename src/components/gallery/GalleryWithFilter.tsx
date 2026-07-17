"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/AuthProvider";
import { useDebounce } from "@/hooks/use-debounce";
import { GalleryInfinite } from "@/components/gallery/GalleryInfinite";
import { GallerySkeleton } from "@/components/gallery/GallerySkeleton";
import {
  TripTagFilter,
  type TripTagOption,
} from "@/components/TripTagFilter";
import { GALLERY_REFRESH_EVENT } from "@/lib/gallery-admin";
import { galleryCopy } from "@/lib/gallery-copy";
import type { GalleryItem } from "@/lib/gallery";
import { formatTagLabel, hasPhotoTag } from "@/lib/photo-tags";

type MediaType = "all" | "photo" | "video";
type SortOrder = "newest" | "oldest";

type GalleryWithFilterProps = {
  initialItems: GalleryItem[];
  initialViewerItems?: GalleryItem[];
  initialHasNext: boolean;
  pageSize: number;
  initialKeyword?: string;
  tag?: string;
  place?: string;
  trip?: string;
  emptyMessage?: string;
  gridEngine?: "cards" | "lightgallery";
  /** Show a tag select beside media filters (places / things detail pages). */
  showTagFilter?: boolean;
};

const mediaTypeFilters = [
  { value: "all" as MediaType, key: "all" },
  { value: "photo" as MediaType, key: "photo" },
  { value: "video" as MediaType, key: "video" },
] as const;

const SCOPED_VIEWER_PAGE_SIZE = 10_000;

export function GalleryWithFilter({
  initialItems,
  initialViewerItems,
  initialHasNext,
  pageSize,
  initialKeyword = "",
  tag = "",
  place = "",
  trip = "",
  emptyMessage,
  gridEngine = "cards",
  showTagFilter = false,
}: GalleryWithFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isAdmin } = useAuth();

  const [mediaType, setMediaType] = useState<MediaType>(() => {
    const param = searchParams.get("mediaType");
    return param === "photo" || param === "video" ? param : "all";
  });
  const [sortOrder, setSortOrder] = useState<SortOrder>(() => {
    const param = searchParams.get("sortOrder");
    return param === "oldest" ? "oldest" : "newest";
  });
  const [keyword, setKeyword] = useState(initialKeyword);
  const [photoTagFilter, setPhotoTagFilter] = useState<string | null>(null);
  const isScoped = Boolean(tag || place || trip);
  const adminClickToEdit = isAdmin && Boolean(tag || place);
  const [items, setItems] = useState<GalleryItem[]>(initialItems);
  const [viewerItems, setViewerItems] = useState<GalleryItem[]>(
    initialViewerItems ?? initialItems,
  );
  const [hasNext, setHasNext] = useState(initialHasNext);
  const [selectedId, setSelectedId] = useState<string | null>(
    searchParams.get("media"),
  );
  const [isFiltering, startTransition] = useTransition();

  const debouncedKeyword = useDebounce(keyword, 280);
  const lastFilterKeyRef = useRef<string | null>(null);
  if (lastFilterKeyRef.current === null) {
    const mediaParam = searchParams.get("mediaType");
    const initialMediaType =
      mediaParam === "photo" || mediaParam === "video" ? mediaParam : "all";
    const initialSortOrder =
      searchParams.get("sortOrder") === "oldest" ? "oldest" : "newest";
    lastFilterKeyRef.current = `${initialMediaType}|${initialSortOrder}|${initialKeyword.trim()}|${tag}|${place}|${trip}`;
  }

  const tagOptions = useMemo(() => {
    if (!showTagFilter) return [] as TripTagOption[];
    const source = viewerItems.length > 0 ? viewerItems : items;
    const exclude = tag.trim().toLowerCase();
    const counts = new Map<string, number>();
    for (const item of source) {
      for (const raw of item.tags ?? []) {
        const next = raw.trim().toLowerCase();
        if (!next) continue;
        if (exclude && next === exclude) continue;
        counts.set(next, (counts.get(next) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .map(([tagValue, count]) => ({ tag: tagValue, count }))
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return formatTagLabel(a.tag).localeCompare(formatTagLabel(b.tag));
      });
  }, [items, showTagFilter, tag, viewerItems]);

  useEffect(() => {
    if (!photoTagFilter) return;
    const stillPresent = tagOptions.some(
      (option) => option.tag === photoTagFilter.toLowerCase(),
    );
    if (!stillPresent) setPhotoTagFilter(null);
  }, [photoTagFilter, tagOptions]);

  const displayItems = useMemo(() => {
    if (!photoTagFilter) return items;
    const source =
      isScoped && viewerItems.length > 0 ? viewerItems : items;
    return source.filter((item) =>
      hasPhotoTag(item.tags ?? [], photoTagFilter),
    );
  }, [isScoped, items, photoTagFilter, viewerItems]);

  const displayViewerItems = useMemo(() => {
    if (!photoTagFilter) return viewerItems;
    return viewerItems.filter((item) =>
      hasPhotoTag(item.tags ?? [], photoTagFilter),
    );
  }, [photoTagFilter, viewerItems]);

  const displayHasNext = photoTagFilter ? false : hasNext;

  const filterExtras = useMemo(() => {
    if (!showTagFilter || tagOptions.length === 0) return null;
    return (
      <TripTagFilter
        tags={tagOptions}
        value={photoTagFilter}
        onChange={setPhotoTagFilter}
      />
    );
  }, [photoTagFilter, showTagFilter, tagOptions]);

  const replaceQuery = useCallback(
    (patch: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(patch).forEach(([key, value]) => {
        if (!value) params.delete(key);
        else params.set(key, value);
      });
      const query = params.toString();
      const nextUrl = query ? `${pathname}?${query}` : pathname;
      const currentUrl = searchParams.toString()
        ? `${pathname}?${searchParams.toString()}`
        : pathname;

      if (nextUrl !== currentUrl) {
        router.replace(nextUrl, { scroll: false });
      }
    },
    [pathname, router, searchParams],
  );

  const normalizedKeyword = useMemo(
    () => debouncedKeyword.trim(),
    [debouncedKeyword],
  );

  useEffect(() => {
    setItems(initialItems);
    setViewerItems(initialViewerItems ?? initialItems);
    setHasNext(initialHasNext);
  }, [initialHasNext, initialItems, initialViewerItems, tag, place, trip]);

  const applyFilter = useCallback(
    async (
      nextMediaType: MediaType,
      nextSortOrder: SortOrder,
      nextKeyword: string,
    ) => {
      replaceQuery({
        mediaType: nextMediaType !== "all" ? nextMediaType : null,
        sortOrder: nextSortOrder !== "newest" ? nextSortOrder : null,
        q: nextKeyword || null,
      });

      startTransition(async () => {
        const params = new URLSearchParams({
          page: "1",
          pageSize: String(pageSize),
          mediaType: nextMediaType,
          sortOrder: nextSortOrder,
        });
        if (nextKeyword) params.set("q", nextKeyword);
        if (tag) params.set("tag", tag);
        if (place) params.set("place", place);
        if (trip) params.set("trip", trip);

        try {
          const requests: Promise<Response>[] = [
            fetch(`/api/gallery?${params.toString()}`, { cache: "no-store" }),
          ];

          if (isScoped) {
            const viewerParams = new URLSearchParams(params);
            viewerParams.set("pageSize", String(SCOPED_VIEWER_PAGE_SIZE));
            requests.push(
              fetch(`/api/gallery?${viewerParams.toString()}`, {
                cache: "no-store",
              }),
            );
          }

          const responses = await Promise.all(requests);
          if (!responses[0]?.ok) return;

          const data = await responses[0].json();
          setItems(data.items);
          setHasNext(data.hasNext);

          let nextViewerItems = data.items as GalleryItem[];
          if (isScoped && responses[1]?.ok) {
            const viewerData = await responses[1].json();
            nextViewerItems = viewerData.items as GalleryItem[];
          }
          setViewerItems(nextViewerItems);

          const activeMedia = searchParams.get("media");
          if (
            activeMedia &&
            !nextViewerItems.some((item) => item.id === activeMedia)
          ) {
            setSelectedId(null);
          }
        } catch {
          // keep current data
        }
      });
    },
    [isScoped, pageSize, place, replaceQuery, searchParams, tag, trip],
  );

  useEffect(() => {
    const filterKey = `${mediaType}|${sortOrder}|${normalizedKeyword}|${tag}|${place}|${trip}`;
    if (lastFilterKeyRef.current === filterKey) return;
    lastFilterKeyRef.current = filterKey;
    void applyFilter(mediaType, sortOrder, normalizedKeyword);
  }, [applyFilter, mediaType, normalizedKeyword, place, sortOrder, tag, trip]);

  useEffect(() => {
    const refresh = () => {
      void applyFilter(mediaType, sortOrder, normalizedKeyword);
    };
    window.addEventListener(GALLERY_REFRESH_EVENT, refresh);
    return () => window.removeEventListener(GALLERY_REFRESH_EVENT, refresh);
  }, [applyFilter, mediaType, normalizedKeyword, place, sortOrder, tag, trip]);

  useEffect(() => {
    setSelectedId(searchParams.get("media"));
  }, [searchParams]);

  const handleSelectedIdChange = (id: string | number | null) => {
    const next = id === null ? null : String(id);
    setSelectedId(next);
    replaceQuery({ media: next });
  };

  const handleItemRemoved = useCallback((itemId: string) => {
    setItems((prev) => prev.filter((item) => String(item.id) !== itemId));
    setViewerItems((prev) => prev.filter((item) => String(item.id) !== itemId));
    if (selectedId === itemId) {
      setSelectedId(null);
      replaceQuery({ media: null });
    }
  }, [replaceQuery, selectedId]);

  return (
    <div className="space-y-8">
      {!isScoped ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
                {galleryCopy.eyebrow}
              </p>
              <h1 className="font-serif text-3xl font-semibold tracking-tight md:text-4xl">
                {galleryCopy.title}
              </h1>
            </div>
            <Link
              href="/gallery"
              className="text-xs uppercase tracking-[0.2em] text-muted-foreground transition hover:text-foreground"
            >
              ← Trips
            </Link>
          </div>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <Tabs
            value={mediaType}
            onValueChange={(value) => setMediaType(value as MediaType)}
          >
            <TabsList className="h-auto w-full justify-start overflow-x-auto rounded-full border border-zinc-200 bg-white/50 p-1 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-900/50 sm:w-auto">
              {mediaTypeFilters.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="shrink-0 rounded-full px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] data-[state=active]:bg-zinc-100 dark:data-[state=active]:bg-white/10 sm:px-4 sm:text-xs sm:tracking-[0.3em]"
                >
                  {galleryCopy.filters[tab.key]}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-center">
            <div className="relative w-full md:w-[320px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <Input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder={galleryCopy.searchPlaceholder}
                aria-label={galleryCopy.searchAria}
                className="h-9 rounded-full border-zinc-200 bg-white/70 pl-9 pr-9 text-sm dark:border-zinc-800 dark:bg-zinc-900/70"
              />
              {keyword ? (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="absolute right-1 top-1 h-7 w-7 rounded-full"
                  aria-label={galleryCopy.clearSearch}
                  onClick={() => setKeyword("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              ) : null}
            </div>

            <Select
              value={sortOrder}
              onValueChange={(value) => setSortOrder(value as SortOrder)}
            >
              <SelectTrigger className="h-9 w-auto min-w-[120px] rounded-full border border-zinc-200 bg-white/50 px-4 text-xs backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-900/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest" className="text-xs">
                  {galleryCopy.filters.newest}
                </SelectItem>
                <SelectItem value="oldest" className="text-xs">
                  {galleryCopy.filters.oldest}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        </div>
      ) : null}

      {isFiltering ? (
        <GallerySkeleton />
      ) : displayItems.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white/60 p-10 text-center text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300">
          {photoTagFilter
            ? `No items tagged #${formatTagLabel(photoTagFilter)}`
            : normalizedKeyword
              ? galleryCopy.noResults
              : (emptyMessage ?? galleryCopy.noResults)}
        </div>
      ) : (
        <GalleryInfinite
          initialItems={displayItems}
          viewerItems={isScoped ? displayViewerItems : undefined}
          initialPage={1}
          pageSize={pageSize}
          hasNext={displayHasNext}
          mediaType={mediaType}
          sortOrder={sortOrder}
          keyword={normalizedKeyword}
          tag={tag}
          place={place}
          trip={trip}
          selectedId={selectedId}
          onSelectedIdChange={handleSelectedIdChange}
          showHeader={!isScoped}
          onItemRemoved={isScoped ? handleItemRemoved : undefined}
          clickToEdit={adminClickToEdit}
          gridEngine={gridEngine}
          filterExtras={filterExtras}
        />
      )}
    </div>
  );
}
