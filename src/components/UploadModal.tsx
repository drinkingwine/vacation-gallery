"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import type { Trip, UploadFile } from "@/lib/types";
import {
  MAX_IMAGE_UPLOAD_BYTES,
  MAX_VIDEO_UPLOAD_BYTES,
  contentTypeForFilename,
  isImage,
  isVideo,
} from "@/lib/media";
import {
  compressImage,
  delay,
  fetchWithTimeout,
  makeUniqueFilename,
} from "@/lib/upload-utils";
import { extractPhotoExif } from "@/lib/photo-exif";
import { formatMediaCountFromTrip } from "@/lib/media-count";

const MAX_FILES = 50;
const MAX_IMAGE_MB = Math.round(MAX_IMAGE_UPLOAD_BYTES / (1024 * 1024));
const MAX_VIDEO_MB = Math.round(MAX_VIDEO_UPLOAD_BYTES / (1024 * 1024));
const UPLOAD_RETRY_DELAY_MS = 1500;
const ACCEPTED_TYPES = {
  "image/*": [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".avif", ".heic"],
  "video/*": [".mp4", ".mov", ".webm", ".m4v", ".avi", ".mkv"],
};

type UploadModalProps = {
  trips: Trip[];
  defaultTrip?: string;
  onClose: () => void;
  onUploadComplete: () => void;
};

export function UploadModal({
  trips,
  defaultTrip = "",
  onClose,
  onUploadComplete,
}: UploadModalProps) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [selectedTrip, setSelectedTrip] = useState(defaultTrip);
  const [tripMode, setTripMode] = useState<"select" | "create">("select");
  const [newTripName, setNewTripName] = useState("");
  const [newTripTitle, setNewTripTitle] = useState("");
  const [newTripLocation, setNewTripLocation] = useState("");
  const [newTripStart, setNewTripStart] = useState("");
  const [newTripEnd, setNewTripEnd] = useState("");
  const [newTripDescription, setNewTripDescription] = useState("");
  const [creatingTrip, setCreatingTrip] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [localTrips, setLocalTrips] = useState<Trip[]>(trips);
  const abortRef = useRef(false);

  useEffect(() => {
    setLocalTrips(trips);
  }, [trips]);

  useEffect(() => {
    setSelectedTrip(defaultTrip);
  }, [defaultTrip]);

  const selectableTrips = useMemo(() => {
    const tripKey = defaultTrip.trim();
    if (!tripKey) return localTrips;
    if (
      localTrips.some((trip) => trip.path === tripKey || trip.name === tripKey)
    ) {
      return localTrips;
    }

    return [
      {
        name: tripKey,
        path: tripKey,
        photoCount: 0,
        coverUrl: null,
        title: tripKey.replace(/-/g, " "),
      },
      ...localTrips,
    ];
  }, [defaultTrip, localTrips]);

  useEffect(() => {
    abortRef.current = false;
    return () => {
      abortRef.current = true;
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isUploading) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, isUploading]);

  useEffect(() => {
    return () => files.forEach((f) => URL.revokeObjectURL(f.preview));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onDrop = useCallback((accepted: File[]) => {
    setFiles((prev) => {
      const remaining = MAX_FILES - prev.length;
      const batch = accepted.slice(0, remaining).map((file) => ({
        id: crypto.randomUUID(),
        file,
        preview: URL.createObjectURL(file),
        status: "pending" as const,
      }));
      return [...prev, ...batch];
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    multiple: true,
    maxFiles: MAX_FILES,
    maxSize: MAX_VIDEO_UPLOAD_BYTES,
    validator: (file) => {
      const limit = isVideo(file.name)
        ? MAX_VIDEO_UPLOAD_BYTES
        : MAX_IMAGE_UPLOAD_BYTES;
      if (file.size > limit) {
        const maxMb = Math.round(limit / (1024 * 1024));
        return {
          code: "file-too-large",
          message: `Max ${maxMb}MB for ${isVideo(file.name) ? "videos" : "photos"}`,
        };
      }
      return null;
    },
  });

  const removeFile = (index: number) => {
    setFiles((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const clearAll = () => {
    files.forEach((f) => URL.revokeObjectURL(f.preview));
    setFiles([]);
  };

  const handleCreateTrip = async () => {
    if (!newTripName.trim() || creatingTrip) return;
    setCreatingTrip(true);
    try {
      const res = await fetch("/api/trips/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTripName,
          title: newTripTitle || undefined,
          location: newTripLocation || undefined,
          startDate: newTripStart || undefined,
          endDate: newTripEnd || undefined,
          description: newTripDescription || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        const created: Trip = {
          name: data.name,
          path: data.name,
          photoCount: 0,
          coverUrl: null,
          title: data.title ?? data.name.replace(/-/g, " "),
          location: data.location,
          startDate: data.startDate,
          endDate: data.endDate,
          description: data.description,
        };
        setLocalTrips((prev) => [...prev, created]);
        setSelectedTrip(data.name);
        setTripMode("select");
        setNewTripName("");
        setNewTripTitle("");
        setNewTripLocation("");
        setNewTripStart("");
        setNewTripEnd("");
        setNewTripDescription("");
        onUploadComplete();
      } else {
        alert(data.error ?? "Failed to create trip");
      }
    } finally {
      setCreatingTrip(false);
    }
  };

  const handleUpload = async () => {
    if (isUploading) return;

    const pending = files
      .map((f, i) => ({ f, i }))
      .filter(({ f }) => f.status === "pending");

    if (pending.length === 0) return;

    setIsUploading(true);
    abortRef.current = false;
    let successCount = 0;
    const usedNames = new Set<string>();

    const updateFile = (
      index: number,
      patch: Partial<UploadFile>,
    ) => {
      setFiles((prev) =>
        prev.map((f, i) => (i === index ? { ...f, ...patch } : f)),
      );
    };

    for (const { f, i } of pending) {
      if (abortRef.current) break;

      const uploadName = makeUniqueFilename(f.file.name, usedNames);
      updateFile(i, { status: "uploading", uploadName, error: undefined });

      try {
        const isVideoFile = isVideo(f.file.name);
        const exif = isImage(f.file.name)
          ? await extractPhotoExif(f.file)
          : null;
        const prepared = isVideoFile ? f.file : await compressImage(f.file);
        const contentType =
          prepared.type || contentTypeForFilename(uploadName);

        let presignRes: Response | null = null;
        for (let attempt = 0; attempt < 3; attempt++) {
          if (abortRef.current) break;

          try {
            presignRes = await fetchWithTimeout(
              "/api/upload/presign",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  filename: uploadName,
                  trip: selectedTrip || undefined,
                  contentType,
                  contentLength: prepared.size,
                }),
              },
              30_000,
            );
          } catch (err) {
            if (attempt === 2) throw err;
            await delay(UPLOAD_RETRY_DELAY_MS * (attempt + 1));
            continue;
          }

          if (
            presignRes.status === 403 ||
            presignRes.status === 429 ||
            presignRes.status >= 500
          ) {
            if (attempt < 2) {
              await delay(UPLOAD_RETRY_DELAY_MS * (attempt + 1));
              continue;
            }
          }
          break;
        }

        if (!presignRes) {
          updateFile(i, { status: "error", error: "Upload cancelled" });
          continue;
        }

        const presignData = await presignRes.json();
        if (!presignRes.ok) {
          updateFile(i, {
            status: "error",
            error: presignData.error ?? "Failed to prepare upload",
          });
          continue;
        }

        const putRes = await fetch(presignData.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": contentType },
          body: prepared,
        });

        if (!putRes.ok) {
          updateFile(i, {
            status: "error",
            error: `Storage upload failed (${putRes.status})`,
          });
          continue;
        }

        const completeRes = await fetchWithTimeout(
          "/api/upload/complete",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              path: presignData.path,
              trip: selectedTrip || undefined,
              ...(exif
                ? {
                    latitude: exif.latitude,
                    longitude: exif.longitude,
                    dateTaken: exif.dateTaken,
                  }
                : {}),
            }),
          },
          60_000,
        );

        const data = await completeRes.json();
        if (completeRes.ok) {
          successCount++;
          updateFile(i, { status: "done" });
        } else {
          updateFile(i, {
            status: "error",
            error: data.error ?? "Upload failed",
          });
        }
      } catch (err) {
        const message =
          err instanceof Error && err.name === "AbortError"
            ? "Upload timed out"
            : err instanceof Error
              ? err.message
              : "Network error";
        updateFile(i, { status: "error", error: message });
      }

      if (!abortRef.current) {
        await delay(200);
      }
    }

    setIsUploading(false);
    if (successCount > 0) onUploadComplete();
  };

  const retryFailed = () => {
    setFiles((prev) =>
      prev.map((f) =>
        f.status === "error"
          ? { ...f, status: "pending" as const, error: undefined }
          : f,
      ),
    );
  };

  const total = files.length;
  const doneCount = files.filter((f) => f.status === "done").length;
  const errorCount = files.filter((f) => f.status === "error").length;
  const pendingCount = files.filter((f) => f.status === "pending").length;
  const uploadingCount = files.filter((f) => f.status === "uploading").length;
  const allDone = total > 0 && doneCount === total;
  const progress = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  const canUpload = pendingCount > 0 && !isUploading;
  const atLimit = total >= MAX_FILES;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => !isUploading && onClose()}
      />

      <div className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
          <div>
            <h2 className="font-serif text-xl text-zinc-900">Upload media</h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              Up to {MAX_FILES} files · photos {MAX_IMAGE_MB}MB · videos{" "}
              {MAX_VIDEO_MB}MB
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 disabled:opacity-40"
          >
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Destination trip
            </label>

            {tripMode === "select" ? (
              <div className="flex gap-2">
                <select
                  value={selectedTrip}
                  onChange={(e) => setSelectedTrip(e.target.value)}
                  disabled={isUploading}
                  className="flex-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/40 disabled:opacity-60"
                >
                  <option value="">Root (no trip folder)</option>
                  {selectableTrips.map((t) => (
                    <option key={t.path} value={t.path}>
                      {t.name.replace(/-/g, " ")} ({formatMediaCountFromTrip(t)})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setTripMode("create")}
                  disabled={isUploading}
                  className="whitespace-nowrap rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50 disabled:opacity-60"
                >
                  + New trip
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    type="text"
                    value={newTripName}
                    onChange={(e) => setNewTripName(e.target.value)}
                    placeholder="Folder name (e.g. amalfi-coast-2024)"
                    className="rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/40 sm:col-span-2"
                  />
                  <input
                    type="text"
                    value={newTripTitle}
                    onChange={(e) => setNewTripTitle(e.target.value)}
                    placeholder="Display title (optional)"
                    className="rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/40"
                  />
                  <input
                    type="text"
                    value={newTripLocation}
                    onChange={(e) => setNewTripLocation(e.target.value)}
                    placeholder="Location (optional)"
                    className="rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/40"
                  />
                  <input
                    type="date"
                    value={newTripStart}
                    onChange={(e) => setNewTripStart(e.target.value)}
                    className="rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/40"
                  />
                  <input
                    type="date"
                    value={newTripEnd}
                    onChange={(e) => setNewTripEnd(e.target.value)}
                    className="rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/40"
                  />
                  <textarea
                    value={newTripDescription}
                    onChange={(e) => setNewTripDescription(e.target.value)}
                    placeholder="Description (optional)"
                    rows={2}
                    className="rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/40 sm:col-span-2"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleCreateTrip}
                    disabled={!newTripName.trim() || creatingTrip}
                    className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-900/90 disabled:opacity-50"
                  >
                    {creatingTrip ? "Creating…" : "Create trip"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTripMode("select");
                      setNewTripName("");
                      setNewTripTitle("");
                      setNewTripLocation("");
                      setNewTripStart("");
                      setNewTripEnd("");
                      setNewTripDescription("");
                    }}
                    className="rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-500"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          <div
            {...getRootProps()}
            className={[
              "cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all",
              atLimit
                ? "cursor-not-allowed border-amber-300 bg-amber-50 opacity-60"
                : isDragActive
                  ? "border-zinc-900 bg-zinc-900/5"
                  : "border-zinc-300 hover:border-zinc-900 hover:bg-zinc-50",
            ].join(" ")}
          >
            <input {...getInputProps()} disabled={atLimit} />
            <p className="text-sm font-medium text-zinc-700">
              {isDragActive ? "Drop files here" : "Drag & drop photos or videos"}
            </p>
            <p className="mt-1 text-xs text-zinc-400">
              or click to browse · JPG, PNG, WebP, HEIC, MP4, MOV, and more
            </p>
          </div>

          {total > 0 && (
            <div>
              {errorCount > 0 && !isUploading && (
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-red-600">
                    {errorCount} failed — large photos are auto-compressed
                  </span>
                  <button
                    type="button"
                    onClick={retryFailed}
                    className="text-zinc-900 underline"
                  >
                    Retry failed
                  </button>
                </div>
              )}
              <div className="grid max-h-48 grid-cols-6 gap-2 overflow-y-auto">
              {files.map((f, i) => (
                <div
                  key={f.id}
                  className="relative aspect-square overflow-hidden rounded-lg bg-zinc-100"
                  title={f.error}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {isVideo(f.file.name) ? (
                    <video
                      src={f.preview}
                      muted
                      playsInline
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <img
                      src={f.preview}
                      alt={f.file.name}
                      className="h-full w-full object-cover"
                    />
                  )}
                  {f.status === "done" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-green-500/40 text-white">
                      ✓
                    </div>
                  )}
                  {f.status === "uploading" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white text-xs">
                      …
                    </div>
                  )}
                  {f.status === "error" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-red-500/50 p-1 text-center text-[10px] text-white">
                      Failed
                    </div>
                  )}
                  {f.status === "pending" && !isUploading && (
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="absolute right-0.5 top-0.5 rounded-full bg-black/60 px-1.5 text-xs text-white"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3 border-t border-zinc-200 px-5 py-4">
          {doneCount > 0 && total > 0 && (
            <div className="h-1.5 overflow-hidden rounded-full bg-zinc-200">
              <div
                className="h-full rounded-full bg-zinc-900 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-zinc-500">
              {total === 0 && "No files selected"}
              {total > 0 && !allDone && `${pendingCount} ready`}
              {allDone && (
                <span className="font-medium text-green-600">
                  All {doneCount} uploaded
                </span>
              )}
            </p>

            <div className="flex gap-2">
              {total > 0 && !isUploading && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="rounded-xl px-3 py-2 text-sm text-zinc-500 hover:bg-zinc-100"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                disabled={isUploading}
                className="rounded-xl px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100 disabled:opacity-50"
              >
                {allDone ? "Done" : "Cancel"}
              </button>
              {!allDone && (
                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={!canUpload}
                  className="rounded-xl bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-900/90 disabled:opacity-50"
                >
                  {isUploading
                    ? `Uploading ${uploadingCount}…`
                    : `Upload ${pendingCount || ""}`}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
