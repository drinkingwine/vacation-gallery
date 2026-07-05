"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { formFieldClass } from "@/lib/form-styles";
import type { Photo } from "@/lib/types";

export default function EditPhotoPageClient() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const tripName = decodeURIComponent(params.slug as string);
  const photoName = decodeURIComponent(params.photo as string);
  const { isAdmin, loading: authLoading } = useAuth();

  const returnTo = searchParams.get("from");
  const tripHref = `/trips/${encodeURIComponent(tripName)}`;
  const cancelHref = returnTo ?? tripHref;

  const [photo, setPhoto] = useState<Photo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filename, setFilename] = useState("");
  const [caption, setCaption] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const loadPhoto = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/photos?trip=${encodeURIComponent(tripName)}`,
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      const photos = (await res.json()) as Photo[];
      const match =
        photos.find((p) => p.name === photoName) ??
        photos.find((p) => decodeURIComponent(p.name) === photoName);

      if (!match) {
        throw new Error("Photo not found in this trip");
      }

      setPhoto(match);
      setFilename(match.name);
      setCaption(match.caption ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load photo");
    } finally {
      setLoading(false);
    }
  }, [photoName, tripName]);

  useEffect(() => {
    loadPhoto();
  }, [loadPhoto]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAdmin) router.replace(cancelHref);
  }, [authLoading, cancelHref, isAdmin, router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photo) return;

    setSaving(true);
    setSaveError(null);

    try {
      const res = await fetch("/api/photos/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: photo.path,
          sha: photo.sha,
          trip: tripName,
          newName: filename !== photo.name ? filename : undefined,
          caption,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      router.push(cancelHref);
      router.refresh();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const previewUrl = useMemo(() => photo?.downloadUrl ?? null, [photo]);

  if (authLoading || (!isAdmin && !loading)) {
    return null;
  }

  return (
    <>
      <Header backHref={cancelHref} backLabel="Back" />

      <main className="page-container main-offset mx-auto flex-1 px-0 pb-16">
        <div className="mx-auto max-w-md space-y-6">
          <header className="space-y-1">
            <h1 className="font-serif text-3xl font-semibold text-zinc-900 dark:text-white">
              Edit photo
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{tripName}</p>
          </header>

          {loading ? (
            <div className="rounded-2xl border border-zinc-200 bg-white/60 p-8 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400">
              Loading photo…
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              <p>{error}</p>
              <button
                type="button"
                onClick={loadPhoto}
                className="mt-2 underline"
              >
                Retry
              </button>
            </div>
          ) : (
            <form
              onSubmit={handleSave}
              className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="space-y-4 p-5">
                {saveError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
                    {saveError}
                  </div>
                )}

                {previewUrl && (
                  <div className="overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-950">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrl}
                      alt={photo?.name ?? photoName}
                      className="max-h-64 w-full object-contain"
                    />
                  </div>
                )}

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Filename
                  </label>
                  <input
                    type="text"
                    value={filename}
                    onChange={(e) => setFilename(e.target.value)}
                    className={formFieldClass}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Caption
                  </label>
                  <textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    rows={3}
                    placeholder="Optional description for this photo"
                    className={formFieldClass}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-zinc-200 px-5 py-4 dark:border-zinc-800">
                <Link
                  href={cancelHref}
                  className="rounded-xl px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={saving || !filename.trim()}
                  className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
                >
                  {saving ? "Saving…" : "Save changes"}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
