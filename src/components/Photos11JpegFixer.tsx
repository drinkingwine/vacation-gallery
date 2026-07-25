"use client";

import { useCallback, useRef, useState } from "react";
import { CheckCircle2, FolderInput, LoaderCircle, XCircle } from "lucide-react";
import JSZip from "jszip";
import {
  collectJpegsFromDataTransfer,
  collectJpegsFromFileList,
  makePhotos11CompatibleJpeg,
  type DirectoryJpegEntry,
} from "@/lib/photos11-jpeg";
import { cn } from "@/lib/utils";

type FileStatus = "pending" | "processing" | "done" | "error";

type QueueItem = DirectoryJpegEntry & {
  status: FileStatus;
  error?: string;
};

export function Photos11JpegFixer() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<QueueItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [message, setMessage] = useState<string | null>(null);

  const resetInput = () => {
    if (inputRef.current) inputRef.current.value = "";
  };

  const loadEntries = useCallback((entries: DirectoryJpegEntry[]) => {
    setMessage(null);
    if (entries.length === 0) {
      setItems([]);
      setMessage("No .jpg / .jpeg files found in that folder.");
      return;
    }
    setItems(
      entries.map((entry) => ({
        ...entry,
        status: "pending" as const,
      })),
    );
    setProgress({ done: 0, total: entries.length });
  }, []);

  const onDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    if (running) return;
    try {
      const entries = await collectJpegsFromDataTransfer(event.dataTransfer);
      loadEntries(entries);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to read folder");
    }
  };

  const onFolderPick = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (running) return;
    const list = event.target.files;
    if (!list) return;
    loadEntries(collectJpegsFromFileList(list));
    resetInput();
  };

  const processAndDownload = async () => {
    if (running || items.length === 0) return;
    setRunning(true);
    setMessage(null);
    setProgress({ done: 0, total: items.length });

    const zip = new JSZip();
    let successCount = 0;
    let errorCount = 0;

    for (let index = 0; index < items.length; index++) {
      const item = items[index]!;
      setItems((prev) =>
        prev.map((row, i) =>
          i === index
            ? { ...row, status: "processing", error: undefined }
            : row,
        ),
      );

      try {
        const converted = await makePhotos11CompatibleJpeg(item.file);
        const zipPath = item.relativePath.replace(/\.[^.]+$/i, ".jpg");
        // Preserve original capture/file date on the zip entry so unzip keeps it.
        zip.file(zipPath, converted, {
          date: new Date(converted.lastModified),
        });
        successCount += 1;
        setItems((prev) =>
          prev.map((row, i) =>
            i === index ? { ...row, status: "done" } : row,
          ),
        );
      } catch (err) {
        errorCount += 1;
        const error =
          err instanceof Error ? err.message : "Conversion failed";
        setItems((prev) =>
          prev.map((row, i) =>
            i === index ? { ...row, status: "error", error } : row,
          ),
        );
      }

      setProgress({ done: index + 1, total: items.length });
    }

    if (successCount > 0) {
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `photos11-compatible-${new Date()
        .toISOString()
        .slice(0, 10)}.zip`;
      anchor.click();
      URL.revokeObjectURL(url);
    }

    setMessage(
      errorCount === 0
        ? `Converted ${successCount} JPEG${successCount === 1 ? "" : "s"}. Download started.`
        : `Converted ${successCount}, failed ${errorCount}. Download includes successful files.`,
    );
    setRunning(false);
  };

  const clearQueue = () => {
    if (running) return;
    setItems([]);
    setProgress({ done: 0, total: 0 });
    setMessage(null);
    resetInput();
  };

  return (
    <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="space-y-1">
        <h2 className="font-serif text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Photos 11 JPEG fix
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Drop a folder of{" "}
          <span className="font-medium text-zinc-700 dark:text-zinc-200">
            .jpg
          </span>{" "}
          files. Each image is re-encoded as a standard baseline JPEG so Apple
          Photos 11 can import it. Original capture date (EXIF) and file date are
          preserved when possible.
        </p>
      </div>

      <div
        onDragEnter={(event) => {
          event.preventDefault();
          if (!running) setDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (!running) setDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          if (event.currentTarget === event.target) setDragging(false);
        }}
        onDrop={(event) => {
          void onDrop(event);
        }}
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition",
          dragging
            ? "border-zinc-900 bg-zinc-50 dark:border-zinc-100 dark:bg-zinc-950"
            : "border-zinc-300 dark:border-zinc-700",
          running && "pointer-events-none opacity-60",
        )}
      >
        <FolderInput className="h-8 w-8 text-zinc-400" aria-hidden />
        <div className="space-y-1">
          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
            Drop a folder here
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Or choose a folder from disk
          </p>
        </div>
        <button
          type="button"
          disabled={running}
          onClick={() => inputRef.current?.click()}
          className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-xs font-medium uppercase tracking-[0.15em] text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          Choose folder
        </button>
        <input
          ref={(el) => {
            inputRef.current = el;
            if (el) {
              el.setAttribute("webkitdirectory", "");
              el.setAttribute("directory", "");
            }
          }}
          type="file"
          multiple
          className="hidden"
          onChange={onFolderPick}
        />
      </div>

      {items.length > 0 ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              {progress.done}/{progress.total} processed · {items.length} JPEG
              {items.length === 1 ? "" : "s"} queued
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={running}
                onClick={clearQueue}
                className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Clear
              </button>
              <button
                type="button"
                disabled={running}
                onClick={() => void processAndDownload()}
                className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.15em] text-white transition hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
              >
                {running ? (
                  <>
                    <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                    Converting…
                  </>
                ) : (
                  "Convert & download zip"
                )}
              </button>
            </div>
          </div>

          {running || progress.done > 0 ? (
            <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
              <div
                className="h-full bg-zinc-900 transition-all dark:bg-zinc-100"
                style={{
                  width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%`,
                }}
              />
            </div>
          ) : null}

          <ul className="max-h-64 space-y-1 overflow-y-auto rounded-xl border border-zinc-100 p-2 text-sm dark:border-zinc-800">
            {items.map((item) => (
              <li
                key={item.relativePath}
                className="flex items-start gap-2 rounded-lg px-2 py-1.5"
              >
                {item.status === "done" ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                ) : item.status === "error" ? (
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                ) : item.status === "processing" ? (
                  <LoaderCircle className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-zinc-400" />
                ) : (
                  <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full border border-zinc-300 dark:border-zinc-600" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-zinc-800 dark:text-zinc-100">
                    {item.relativePath}
                  </span>
                  {item.error ? (
                    <span className="block text-xs text-red-500">
                      {item.error}
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {message ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-300">{message}</p>
      ) : null}
    </section>
  );
}
