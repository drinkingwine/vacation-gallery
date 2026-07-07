import { parsePhotoTimestamp } from "@/lib/photo-exif";

export function formatPhotoFileSize(bytes?: number | null) {
  if (typeof bytes !== "number") return null;
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let i = 0;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function formatPhotoDate(date?: string | null) {
  if (!date) return null;
  return new Date(date).toLocaleString(undefined, { hour12: false });
}

export function formatPhotoTimestamp(date?: string | null) {
  if (!date?.trim()) return null;

  const parsed = parsePhotoTimestamp(date);
  if (parsed === null) return date.trim();

  return new Date(parsed).toLocaleString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function formatPhotoResolution(
  width?: number | null,
  height?: number | null,
) {
  if (width && height) return `${width} x ${height}`;
  return null;
}
