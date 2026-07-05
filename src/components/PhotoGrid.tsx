"use client";

import { useMemo, useState } from "react";
import { FilterBar } from "@/components/FilterBar";
import { Lightbox } from "@/components/Lightbox";
import type { Photo, SortField, SortOrder } from "@/lib/types";

type PhotoGridProps = {
  photos: Photo[];
  loading?: boolean;
  emptyMessage?: string;
  isAdmin?: boolean;
  onPhotoDeleted?: () => void;
};

export function PhotoGrid({
  photos,
  loading,
  emptyMessage,
  isAdmin = false,
  onPhotoDeleted,
}: PhotoGridProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [search, setSearch] = useState("");
  const [deletingPath, setDeletingPath] = useState<string | null>(null);

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

  const deletePhoto = async (photo: Photo) => {
    if (
      !confirm(`Delete "${photo.name}"? This cannot be undone.`) ||
      deletingPath
    ) {
      return;
    }

    setDeletingPath(photo.path);
    try {
      const res = await fetch("/api/photos/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: photo.path, sha: photo.sha }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Delete failed");

      if (lightboxIndex !== null) {
        const deletedIdx = filtered.findIndex((p) => p.path === photo.path);
        if (deletedIdx === lightboxIndex) {
          if (filtered.length <= 1) setLightboxIndex(null);
          else if (deletedIdx >= filtered.length - 1) {
            setLightboxIndex(Math.max(0, deletedIdx - 1));
          }
        } else if (deletedIdx < lightboxIndex) {
          setLightboxIndex(lightboxIndex - 1);
        }
      }

      onPhotoDeleted?.();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletingPath(null);
    }
  };

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
            <div
              key={photo.sha + photo.path}
              className="group relative mb-4 break-inside-avoid"
            >
              <button
                type="button"
                onClick={() => setLightboxIndex(idx)}
                className="block w-full overflow-hidden rounded-xl bg-stone-100 ring-1 ring-stone-200/60 transition-all hover:ring-stone-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-terracotta"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.downloadUrl}
                  alt={photo.name}
                  loading="lazy"
                  className="w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                />
              </button>

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => deletePhoto(photo)}
                  disabled={deletingPath === photo.path}
                  className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-1 text-xs text-white opacity-0 transition-opacity hover:bg-red-600 group-hover:opacity-100 disabled:opacity-50"
                  title="Delete photo"
                >
                  {deletingPath === photo.path ? "…" : "Delete"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {lightboxIndex !== null && (
        <Lightbox
          photos={filtered}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
          isAdmin={isAdmin}
          onDelete={deletePhoto}
          deleting={deletingPath !== null}
        />
      )}
    </>
  );
}
