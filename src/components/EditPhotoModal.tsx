"use client";

import { useEffect, useState } from "react";
import type { Photo } from "@/lib/types";

type EditPhotoModalProps = {
  photo: Photo;
  tripName: string;
  onClose: () => void;
  onSaved: () => void;
};

export function EditPhotoModal({
  photo,
  tripName,
  onClose,
  onSaved,
}: EditPhotoModalProps) {
  const [filename, setFilename] = useState(photo.name);
  const [caption, setCaption] = useState(photo.caption ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

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
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => !saving && onClose()}
      />

      <form
        onSubmit={handleSave}
        className="relative z-10 w-full max-w-md rounded-2xl bg-white shadow-2xl"
      >
        <div className="border-b border-zinc-200 px-5 py-4">
          <h2 className="font-serif text-xl text-zinc-900">Edit photo</h2>
        </div>

        <div className="space-y-4 p-5">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="overflow-hidden rounded-xl bg-zinc-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.downloadUrl}
              alt={photo.name}
              className="max-h-48 w-full object-contain"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700">
              Filename
            </label>
            <input
              type="text"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700">
              Caption
            </label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={2}
              placeholder="Optional description for this photo"
              className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-zinc-200 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !filename.trim()}
            className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
