const MAX_DIMENSION = 2048;
const JPEG_QUALITY = 0.82;
const COMPRESS_THRESHOLD = 1.5 * 1024 * 1024; // 1.5 MB
const TARGET_MAX_BYTES = 3 * 1024 * 1024; // stay under Vercel ~4.5MB body limit

const COMPRESSIBLE = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

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
      reject(new Error("Could not read image"));
    };
    img.src = url;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Compression failed"));
      },
      type,
      quality,
    );
  });
}

export async function compressImage(file: File): Promise<File> {
  if (!COMPRESSIBLE.has(file.type) || file.size <= COMPRESS_THRESHOLD) {
    return file;
  }

  try {
    const img = await loadImage(file);
    const scale = Math.min(
      1,
      MAX_DIMENSION / img.width,
      MAX_DIMENSION / img.height,
    );
    const width = Math.max(1, Math.round(img.width * scale));
    const height = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    ctx.drawImage(img, 0, 0, width, height);

    let quality = JPEG_QUALITY;
    let blob = await canvasToBlob(canvas, "image/jpeg", quality);

    while (blob.size > TARGET_MAX_BYTES && quality > 0.5) {
      quality -= 0.08;
      blob = await canvasToBlob(canvas, "image/jpeg", quality);
    }

    const base = file.name.replace(/\.[^.]+$/, "") || "photo";
    return new File([blob], `${base}.jpg`, {
      type: "image/jpeg",
      lastModified: file.lastModified,
    });
  } catch {
    return file;
  }
}

export function makeUniqueFilename(name: string, used: Set<string>): string {
  const key = name.toLowerCase();
  if (!used.has(key)) {
    used.add(key);
    return name;
  }

  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : "";

  let n = 2;
  while (used.has(`${base}-${n}${ext}`.toLowerCase())) n++;

  const unique = `${base}-${n}${ext}`;
  used.add(unique.toLowerCase());
  return unique;
}

export async function fetchWithTimeout(
  input: RequestInfo,
  init: RequestInit,
  ms = 120_000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
