"use client";

import { useMemo, useState } from "react";
import { FilterBar } from "@/components/FilterBar";
import { Lightbox } from "@/components/Lightbox";
import type { Photo, SortField, SortOrder } from "@/lib/types";

type PhotoGridProps = {
  photos: Photo[];
  loading?: boolean;
  emptyMessage?: string;
};

export function PhotoGrid({ photos, loading, emptyMessage }: PhotoGridProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let result = [...photos];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((p) => p.name.toLowerCase().includes(q));
    }

    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === "name") cmp = a.name.localeCompare(b.name);
      if (sortField === "size") cmp = a.size - b.size;
      return sortOrder === "asc" ? cmp : -cmp;
    });

    return result;
  }, [photos, sortField, sortOrder, search]);

  if (loading) {
    return (
      <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={i}
            className="mb-4 break-inside-avoid animate-pulse rounded-xl bg-stone-200"
            style={{ height: `${180 + (i % 3) * 60}px` }}
          />
        ))}
      </div>
    );
  }

  return (
    <>
      <FilterBar
        sortField={sortField}
        sortOrder={sortOrder}
        search={search}
        onSortField={setSortField}
        onSortOrder={setSortOrder}
        onSearch={setSearch}
        total={filtered.length}
      />

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-stone-400">
          <p className="text-sm">{emptyMessage ?? "No photos found"}</p>
        </div>
      ) : (
        <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
          {filtered.map((photo, idx) => (
            <button
              key={photo.sha + photo.path}
              type="button"
              onClick={() => setLightboxIndex(idx)}
              className="group mb-4 block w-full break-inside-avoid overflow-hidden rounded-xl bg-stone-100 ring-1 ring-stone-200/60 transition-all hover:ring-stone-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-terracotta"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.downloadUrl}
                alt={photo.name}
                loading="lazy"
                className="w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              />
              <div className="absolute inset-x-0 bottom-0 hidden bg-gradient-to-t from-black/60 to-transparent p-4 opacity-0 transition-opacity group-hover:opacity-100">
                <p className="text-left text-sm text-white">{photo.name}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {lightboxIndex !== null && (
        <Lightbox
          photos={filtered}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}
    </>
  );
}
