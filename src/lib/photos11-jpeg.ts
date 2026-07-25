import { isVideo } from "@/lib/media";

const JPEG_QUALITY = 0.92;

const JPEG_EXT = /\.jpe?g$/i;

export function isJpegFilename(name: string): boolean {
  return JPEG_EXT.test(name) && !isVideo(name);
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not decode image"));
    };
    img.src = url;
  });
}

function canvasToJpegBlob(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("JPEG encode failed"));
      },
      "image/jpeg",
      quality,
    );
  });
}

/** Find the APP1 (EXIF) segment in a JPEG, including marker + length bytes. */
function extractExifApp1(bytes: Uint8Array): Uint8Array | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;

  let offset = 2;
  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) break;
    const marker = bytes[offset + 1]!;
    if (marker === 0xda) break; // SOS
    if (marker === 0xd9) break; // EOI

    // Standalone markers have no length
    if (marker >= 0xd0 && marker <= 0xd7) {
      offset += 2;
      continue;
    }
    if (marker === 0x01) {
      offset += 2;
      continue;
    }

    const size = (bytes[offset + 2]! << 8) | bytes[offset + 3]!;
    const segmentEnd = offset + 2 + size;
    if (segmentEnd > bytes.length) break;

    if (marker === 0xe1) {
      // APP1 — keep if it looks like EXIF
      const payloadStart = offset + 4;
      const isExif =
        bytes[payloadStart] === 0x45 &&
        bytes[payloadStart + 1] === 0x78 &&
        bytes[payloadStart + 2] === 0x69 &&
        bytes[payloadStart + 3] === 0x66;
      if (isExif) {
        return bytes.slice(offset, segmentEnd);
      }
    }

    offset = segmentEnd;
  }

  return null;
}

/** Insert an APP1 segment after SOI, dropping any existing APP1 EXIF. */
function insertExifApp1(
  jpeg: Uint8Array,
  app1: Uint8Array,
): Uint8Array {
  if (jpeg.length < 2 || jpeg[0] !== 0xff || jpeg[1] !== 0xd8) {
    return jpeg;
  }

  // Strip existing APP1 segments from the re-encoded file
  const parts: Uint8Array[] = [jpeg.slice(0, 2)];
  let offset = 2;
  while (offset + 4 <= jpeg.length) {
    if (jpeg[offset] !== 0xff) {
      parts.push(jpeg.slice(offset));
      break;
    }
    const marker = jpeg[offset + 1]!;
    if (marker === 0xda) {
      parts.push(jpeg.slice(offset));
      break;
    }
    if (marker >= 0xd0 && marker <= 0xd7) {
      parts.push(jpeg.slice(offset, offset + 2));
      offset += 2;
      continue;
    }
    if (marker === 0x01) {
      parts.push(jpeg.slice(offset, offset + 2));
      offset += 2;
      continue;
    }

    const size = (jpeg[offset + 2]! << 8) | jpeg[offset + 3]!;
    const segmentEnd = offset + 2 + size;
    if (segmentEnd > jpeg.length) {
      parts.push(jpeg.slice(offset));
      break;
    }

    if (marker !== 0xe1) {
      parts.push(jpeg.slice(offset, segmentEnd));
    }
    offset = segmentEnd;
  }

  const withoutApp1 = concatUint8(parts);
  // SOI (2) + APP1 + rest
  return concatUint8([
    withoutApp1.slice(0, 2),
    app1,
    withoutApp1.slice(2),
  ]);
}

function concatUint8(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

/**
 * Prefer capture date from EXIF, then the file's existing lastModified.
 * Used so converted downloads keep the photo's original date.
 */
export async function resolveOriginalPhotoDateMs(file: File): Promise<number> {
  try {
    const exifr = (await import("exifr")).default;
    const exif = await exifr.parse(file, [
      "DateTimeOriginal",
      "CreateDate",
      "ModifyDate",
    ]);
    const candidates = [
      exif?.DateTimeOriginal,
      exif?.CreateDate,
      exif?.ModifyDate,
    ];
    for (const value of candidates) {
      if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return value.getTime();
      }
      if (typeof value === "string") {
        // EXIF often uses "YYYY:MM:DD HH:mm:ss"
        const normalized = value.includes(":")
          ? value.replace(/^(\d{4}):(\d{2}):(\d{2})/, "$1-$2-$3")
          : value;
        const parsed = new Date(normalized);
        if (!Number.isNaN(parsed.getTime())) return parsed.getTime();
      }
    }
  } catch {
    // fall through
  }
  return file.lastModified;
}

/**
 * Re-encode a JPEG as a baseline image/jpeg via canvas.
 * This normalizes color handling and encoding so Apple Photos 11 can import it.
 * Preserves EXIF (including GPS/date) when present on the source file.
 * Sets File.lastModified from EXIF capture date when available.
 */
export async function makePhotos11CompatibleJpeg(file: File): Promise<File> {
  const originalBytes = new Uint8Array(await file.arrayBuffer());
  const exifApp1 = extractExifApp1(originalBytes);
  const originalDateMs = await resolveOriginalPhotoDateMs(file);

  const img = await loadImage(file);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, img.naturalWidth || img.width);
  canvas.height = Math.max(1, img.naturalHeight || img.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");

  // White backdrop avoids transparent PNG-style holes if decode yields alpha
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0);

  const blob = await canvasToJpegBlob(canvas, JPEG_QUALITY);
  let outBytes = new Uint8Array(await blob.arrayBuffer());

  if (exifApp1) {
    try {
      outBytes = new Uint8Array(insertExifApp1(outBytes, exifApp1));
    } catch {
      // Keep re-encoded JPEG even if EXIF transplant fails
    }
  }

  const base = file.name.replace(/\.[^.]+$/, "") || "photo";
  const name = `${base}.jpg`;
  return new File([new Blob([outBytes], { type: "image/jpeg" })], name, {
    type: "image/jpeg",
    lastModified: originalDateMs,
  });
}

export type DirectoryJpegEntry = {
  /** Path relative to the dropped folder, using `/` separators. */
  relativePath: string;
  file: File;
};

async function readDirectoryEntries(
  directory: FileSystemDirectoryEntry,
  prefix: string,
): Promise<DirectoryJpegEntry[]> {
  const reader = directory.createReader();
  const entries: FileSystemEntry[] = [];

  // readEntries must be called repeatedly until it returns []
  for (;;) {
    const batch = await new Promise<FileSystemEntry[]>((resolve, reject) => {
      reader.readEntries(resolve, reject);
    });
    if (batch.length === 0) break;
    entries.push(...batch);
  }

  const results: DirectoryJpegEntry[] = [];

  for (const entry of entries) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isFile) {
      const file = await new Promise<File>((resolve, reject) => {
        (entry as FileSystemFileEntry).file(resolve, reject);
      });
      if (isJpegFilename(file.name)) {
        results.push({ relativePath: path, file });
      }
    } else if (entry.isDirectory) {
      const nested = await readDirectoryEntries(
        entry as FileSystemDirectoryEntry,
        path,
      );
      results.push(...nested);
    }
  }

  return results;
}

/** Collect JPEG files from a directory drop (recursive). */
export async function collectJpegsFromDataTransfer(
  dataTransfer: DataTransfer,
): Promise<DirectoryJpegEntry[]> {
  const items = [...dataTransfer.items];
  const results: DirectoryJpegEntry[] = [];

  for (const item of items) {
    if (item.kind !== "file") continue;
    const entry =
      typeof item.webkitGetAsEntry === "function"
        ? item.webkitGetAsEntry()
        : null;

    if (entry?.isDirectory) {
      const nested = await readDirectoryEntries(
        entry as FileSystemDirectoryEntry,
        entry.name,
      );
      results.push(...nested);
      continue;
    }

    if (entry?.isFile) {
      const file = await new Promise<File>((resolve, reject) => {
        (entry as FileSystemFileEntry).file(resolve, reject);
      });
      if (isJpegFilename(file.name)) {
        results.push({ relativePath: file.name, file });
      }
      continue;
    }

    const file = item.getAsFile();
    if (file && isJpegFilename(file.name)) {
      results.push({ relativePath: file.name, file });
    }
  }

  // Fallback: some browsers only expose files[]
  if (results.length === 0 && dataTransfer.files.length > 0) {
    for (const file of dataTransfer.files) {
      if (!isJpegFilename(file.name)) continue;
      const relativePath =
        (file as File & { webkitRelativePath?: string }).webkitRelativePath ||
        file.name;
      results.push({ relativePath, file });
    }
  }

  return results.sort((a, b) =>
    a.relativePath.localeCompare(b.relativePath, undefined, {
      sensitivity: "base",
    }),
  );
}

/** Collect JPEGs from an <input webkitdirectory> FileList. */
export function collectJpegsFromFileList(
  fileList: FileList,
): DirectoryJpegEntry[] {
  const results: DirectoryJpegEntry[] = [];
  for (const file of fileList) {
    if (!isJpegFilename(file.name)) continue;
    const relativePath =
      (file as File & { webkitRelativePath?: string }).webkitRelativePath ||
      file.name;
    results.push({ relativePath, file });
  }
  return results.sort((a, b) =>
    a.relativePath.localeCompare(b.relativePath, undefined, {
      sensitivity: "base",
    }),
  );
}
