const IMAGE_EXT = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".svg",
  ".bmp",
  ".tiff",
  ".avif",
  ".heic",
]);

const VIDEO_EXT = new Set([
  ".mp4",
  ".mov",
  ".webm",
  ".m4v",
  ".avi",
  ".mkv",
  ".mpeg",
  ".mpg",
]);

export type MediaType = "photo" | "video";

function extension(filename: string): string {
  const cleaned = filename.split("?")[0]?.split("#")[0] ?? filename;
  const base = cleaned.includes("/")
    ? cleaned.slice(cleaned.lastIndexOf("/") + 1)
    : cleaned;
  const dot = base.lastIndexOf(".");
  if (dot === -1) return "";
  return base.slice(dot).toLowerCase();
}

export function isImage(filename: string): boolean {
  return IMAGE_EXT.has(extension(filename));
}

export function isVideo(filename: string): boolean {
  return VIDEO_EXT.has(extension(filename));
}

export function isMedia(filename: string): boolean {
  return isImage(filename) || isVideo(filename);
}

export function getMediaType(filename: string): MediaType | null {
  if (isImage(filename)) return "photo";
  if (isVideo(filename)) return "video";
  return null;
}

export function sanitizeMediaFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9.\-_ ]/g, "").trim();
}

export function contentTypeForFilename(filename: string): string {
  const ext = extension(filename);
  const map: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".bmp": "image/bmp",
    ".tiff": "image/tiff",
    ".avif": "image/avif",
    ".heic": "image/heic",
    ".mp4": "video/mp4",
    ".mov": "video/quicktime",
    ".webm": "video/webm",
    ".m4v": "video/x-m4v",
    ".avi": "video/x-msvideo",
    ".mkv": "video/x-matroska",
    ".mpeg": "video/mpeg",
    ".mpg": "video/mpeg",
  };
  return map[ext] ?? "application/octet-stream";
}

export const MAX_IMAGE_UPLOAD_BYTES = 25 * 1024 * 1024;
export const MAX_VIDEO_UPLOAD_BYTES = 500 * 1024 * 1024;

export function maxUploadBytesForFilename(filename: string): number {
  return isVideo(filename) ? MAX_VIDEO_UPLOAD_BYTES : MAX_IMAGE_UPLOAD_BYTES;
}
