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
