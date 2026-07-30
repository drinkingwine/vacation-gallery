import JSZip from "jszip";
import type { GalleryItem } from "@/lib/gallery";

export async function downloadGalleryItem(
  item: Pick<GalleryItem, "path" | "filename">,
) {
  const res = await fetch(
    `/api/photos/download?path=${encodeURIComponent(item.path)}`,
  );
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      typeof data.error === "string" ? data.error : "Download failed",
    );
  }

  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = item.filename || "photo.jpg";
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

function uniqueZipEntryName(
  filename: string,
  used: Map<string, number>,
): string {
  const base = filename.trim() || "photo.jpg";
  const count = used.get(base) ?? 0;
  used.set(base, count + 1);
  if (count === 0) return base;

  const dot = base.lastIndexOf(".");
  if (dot <= 0) return `${base}-${count + 1}`;
  return `${base.slice(0, dot)}-${count + 1}${base.slice(dot)}`;
}

function sanitizeZipFilename(value: string): string {
  const cleaned = value
    .trim()
    .replace(/[^\w.\-() ]+/g, "_")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[.-]+|[.-]+$/g, "");
  return cleaned || "photos";
}

export async function downloadGalleryItemsAsZip(
  items: Array<Pick<GalleryItem, "path" | "filename">>,
  options?: {
    zipName?: string;
    onProgress?: (done: number, total: number) => void;
  },
) {
  if (items.length === 0) {
    throw new Error("No photos to download.");
  }

  const zip = new JSZip();
  const usedNames = new Map<string, number>();
  let successCount = 0;
  const failures: string[] = [];

  options?.onProgress?.(0, items.length);

  for (let index = 0; index < items.length; index++) {
    const item = items[index]!;
    try {
      const res = await fetch(
        `/api/photos/download?path=${encodeURIComponent(item.path)}`,
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          typeof data.error === "string" ? data.error : "Download failed",
        );
      }
      const blob = await res.blob();
      zip.file(uniqueZipEntryName(item.filename || "photo.jpg", usedNames), blob);
      successCount += 1;
    } catch (err) {
      failures.push(
        item.filename ||
          (err instanceof Error ? err.message : "Unknown download error"),
      );
    }
    options?.onProgress?.(index + 1, items.length);
  }

  if (successCount === 0) {
    throw new Error(
      failures[0]
        ? `Failed to download photos (${failures[0]}).`
        : "Failed to download photos.",
    );
  }

  const blob = await zip.generateAsync({ type: "blob" });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = `${sanitizeZipFilename(options?.zipName ?? "photos")}.zip`;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);

  return { successCount, failureCount: failures.length };
}
