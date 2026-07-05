"use client";

import { useMemo, useState } from "react";
import { EditPhotoModal } from "@/components/EditPhotoModal";
import { FilterBar } from "@/components/FilterBar";
import { Lightbox } from "@/components/Lightbox";
import { SpotlightCard } from "@/components/SpotlightCard";
import type { Photo, SortField, SortOrder } from "@/lib/types";

type PhotoGridProps = {
  photos: Photo[];
  loading?: boolean;
  emptyMessage?: string;
  isAdmin?: boolean;
  tripName?: string;
  onPhotoChanged?: () => void;
};

export function PhotoGrid({
  photos,
  loading,
  emptyMessage,
  isAdmin = false,
  tripName = "",
  onPhotoChanged,
}: PhotoGridProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [editingPhoto, setEditingPhoto] = useState<Photo | null>(null);
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [search, setSearch] = useState("");
  const [busyPath, setBusyPath] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let result = [...photos];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.caption?.toLowerCase().includes(q),
      );
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
      busyPath
    ) {
      return;
    }

    setBusyPath(photo.path);
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

      onPhotoChanged?.();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusyPath(null);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={i}
            className="aspect-[4/5] animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800"
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
        <div className="flex flex-col items-center justify-center py-24 text-zinc-400">
          <p className="text-sm">{emptyMessage ?? "No photos found"}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((photo, idx) => (
            <div key={photo.sha + photo.path} className="group relative">
              <SpotlightCard className="aspect-[4/5] cursor-pointer border-zinc-200 bg-zinc-100 shadow-lg shadow-zinc-200/50 transition duration-300 hover:-translate-y-1 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-2xl dark:shadow-black/50">
                <button
                  type="button"
                  onClick={() => setLightboxIndex(idx)}
                  className="relative block h-full w-full overflow-hidden rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.downloadUrl}
                    alt={photo.caption ?? photo.name}
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                  <div className="relative z-10 flex h-full flex-col justify-end gap-2 p-5 text-left text-white">
                    <p className="text-[11px] uppercase tracking-[0.3em] text-white/80">
                      Photo
                    </p>
                    <h3 className="line-clamp-2 text-lg font-semibold">
                      {photo.caption ?? photo.name}
                    </h3>
                  </div>
                </button>
              </SpotlightCard>

              {isAdmin && (
                <div className="absolute right-3 top-3 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => setEditingPhoto(photo)}
                    disabled={busyPath === photo.path}
                    className="rounded-full border border-white/20 bg-black/50 px-2 py-1 text-xs text-white backdrop-blur hover:bg-indigo-600 disabled:opacity-50"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => deletePhoto(photo)}
                    disabled={busyPath === photo.path}
                    className="rounded-full border border-white/20 bg-black/50 px-2 py-1 text-xs text-white backdrop-blur hover:bg-red-600 disabled:opacity-50"
                  >
                    {busyPath === photo.path ? "…" : "Delete"}
                  </button>
                </div>
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
          onEdit={isAdmin && tripName ? setEditingPhoto : undefined}
          busy={busyPath !== null}
        />
      )}

      {editingPhoto && tripName && (
        <EditPhotoModal
          photo={editingPhoto}
          tripName={tripName}
          onClose={() => setEditingPhoto(null)}
          onSaved={() => {
            setEditingPhoto(null);
            onPhotoChanged?.();
          }}
        />
      )}
    </>
  );
}
