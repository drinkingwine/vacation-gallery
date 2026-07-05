"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { FilterBar } from "@/components/FilterBar";
import { Lightbox } from "@/components/Lightbox";
import { SpotlightCard } from "@/components/SpotlightCard";
import { photoEditPath } from "@/lib/edit-paths";
import type { Photo, SortField, SortOrder } from "@/lib/types";

type PhotoGridProps = {
  photos: Photo[];
  loading?: boolean;
  emptyMessage?: string;
  isAdmin?: boolean;
  tripName?: string;
  coverPhoto?: string | null;
  coverUrl?: string | null;
  onPhotoChanged?: () => void;
};

export function PhotoGrid({
  photos,
  loading,
  emptyMessage,
  isAdmin = false,
  tripName = "",
  coverPhoto = null,
  coverUrl = null,
  onPhotoChanged,
}: PhotoGridProps) {
  const router = useRouter();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
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

  const openPhotoEdit = (photo: Photo) => {
    if (!tripName) return;
    router.push(photoEditPath(tripName, photo.name));
  };

  const isCoverPhoto = (photo: Photo) => {
    if (coverPhoto) return photo.name === coverPhoto;
    if (coverUrl) return photo.downloadUrl === coverUrl;
    return false;
  };

  const makeDefault = async (photo: Photo) => {
    if (!tripName || busyPath) return;

    setBusyPath(photo.path);
    try {
      const res = await fetch(
        `/api/trips/${encodeURIComponent(tripName)}/cover`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ photoName: photo.name }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to set default photo");
      onPhotoChanged?.();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to set default photo");
    } finally {
      setBusyPath(null);
    }
  };

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
          {filtered.map((photo, idx) => {
            const isDefault = isCoverPhoto(photo);

            return (
            <div key={photo.sha + photo.path} className="relative">
              <SpotlightCard className="aspect-[4/5] cursor-pointer border-zinc-200 bg-zinc-100 shadow-lg shadow-zinc-200/50 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-2xl dark:shadow-black/50">
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

              <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 p-3">
                {isDefault ? (
                  <span className="shrink-0 rounded-full border border-white/30 bg-black/55 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-white backdrop-blur">
                    Default
                  </span>
                ) : (
                  <span className="shrink-0" />
                )}

                {isAdmin && (
                  <div className="pointer-events-auto flex shrink-0 flex-nowrap items-center gap-1">
                    {!isDefault && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void makeDefault(photo);
                        }}
                        disabled={busyPath === photo.path}
                        className="shrink-0 rounded-full border border-white/20 bg-black/60 px-2 py-1 text-xs text-white backdrop-blur hover:bg-amber-600 disabled:opacity-50"
                      >
                        {busyPath === photo.path ? "…" : "Make default"}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openPhotoEdit(photo);
                      }}
                      disabled={busyPath === photo.path}
                      className="shrink-0 rounded-full border border-white/20 bg-black/60 px-2 py-1 text-xs text-white backdrop-blur hover:bg-indigo-600 disabled:opacity-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void deletePhoto(photo);
                      }}
                      disabled={busyPath === photo.path}
                      className="shrink-0 rounded-full border border-white/20 bg-black/60 px-2 py-1 text-xs text-white backdrop-blur hover:bg-red-600 disabled:opacity-50"
                    >
                      {busyPath === photo.path ? "…" : "Delete"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
          })}
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
          onEdit={isAdmin && tripName ? openPhotoEdit : undefined}
          onMakeDefault={isAdmin && tripName ? makeDefault : undefined}
          isCoverPhoto={isCoverPhoto}
          busy={busyPath !== null}
        />
      )}
    </>
  );
}
