import type { GalleryItem as LgGalleryItem } from "lightgallery/lg-utils";
import { contentTypeForFilename } from "@/lib/media";
import { formatPhotoTimestamp } from "@/lib/photo-details";
import type { GalleryPhoto, Photo, Trip } from "@/lib/types";
import { FAVORITE_TAG } from "@/lib/photo-tags";

export type GalleryItem = {
  id: string;
  type: "photo" | "video";
  src: string;
  title: string;
  filename: string;
  path: string;
  sha: string;
  description?: string | null;
  locationName?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  dateShot?: string | null;
  dateTaken?: string | null;
  createdAt?: string | null;
  tags?: string[];
  size?: number | null;
  width?: number | null;
  height?: number | null;
  blurHash?: string | null;
  tripName?: string;
  tripTitle?: string | null;
  sourceTrip?: string;
  sourcePath?: string;
};

export function buildGalleryItem(photo: GalleryPhoto): GalleryItem {
  const title = photo.caption?.trim() || photo.name;

  return {
    id: photo.id,
    type: photo.mediaType === "video" ? "video" : "photo",
    src: photo.downloadUrl,
    title,
    filename: photo.name,
    path: photo.path,
    sha: photo.sha,
    description: photo.caption ?? null,
    locationName: photo.location ?? photo.tripLocation ?? null,
    latitude: photo.latitude ?? null,
    longitude: photo.longitude ?? null,
    dateShot: photo.dateTaken ?? photo.tripStartDate ?? null,
    dateTaken: photo.dateTaken ?? null,
    createdAt: photo.dateTaken ?? photo.tripStartDate ?? null,
    tags: photo.tags ?? [],
    size: photo.size,
    width: photo.width ?? null,
    height: photo.height ?? null,
    blurHash: photo.blurHash ?? null,
    tripName: photo.tripName,
    tripTitle: photo.tripTitle ?? null,
    sourceTrip: photo.sourceTrip,
    sourcePath: photo.sourcePath,
  };
}

export function buildGalleryItems(photos: GalleryPhoto[]): GalleryItem[] {
  return photos.map(buildGalleryItem);
}

export function getItemDisplayTags(item: GalleryItem, max = 4) {
  const auto = new Set(
    [item.tripName, item.tripTitle, item.locationName]
      .filter((value): value is string => Boolean(value))
      .map((value) => value.toLowerCase()),
  );

  return (item.tags ?? [])
    .filter((tag) => !auto.has(tag.toLowerCase()))
    .slice(0, max);
}

export function itemHasAssignedTags(item: GalleryItem) {
  return (item.tags ?? []).some(
    (tag) => tag.toLowerCase() !== FAVORITE_TAG,
  );
}

export function findPhotoByName(photos: Photo[], photoName: string) {
  const decoded = decodeURIComponent(photoName);
  return (
    photos.find((photo) => photo.name === photoName) ??
    photos.find((photo) => photo.name === decoded) ??
    photos.find((photo) => photo.name.toLowerCase() === photoName.toLowerCase()) ??
    photos.find((photo) => photo.name.toLowerCase() === decoded.toLowerCase())
  );
}

export function getEditablePhotoTags(
  photo: Photo,
  trip?: Pick<Trip, "name" | "title" | "location" | "startDate"> | null,
) {
  const tags = (photo.tags ?? []).filter(
    (tag) => tag.toLowerCase() !== FAVORITE_TAG,
  );

  if (!trip) return tags;

  return stripAutoPhotoTags(tags, photo, trip);
}

export function stripAutoPhotoTags(
  tags: string[],
  photo: Pick<Photo, "location">,
  trip?: Pick<Trip, "name" | "title" | "location"> | null,
) {
  const auto = new Set(
    [trip?.name, trip?.title, trip?.location, photo.location]
      .filter((value): value is string => Boolean(value))
      .map((value) => value.toLowerCase()),
  );

  return tags.filter((tag) => !auto.has(tag.toLowerCase()));
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildLightGallerySubHtml(parts: {
  title?: string | null;
  tripTitle?: string | null;
  locationName?: string | null;
  dateTaken?: string | null;
  dateShot?: string | null;
}) {
  const rawTitle = parts.title?.trim() || "";
  const date = formatPhotoTimestamp(parts.dateTaken ?? parts.dateShot);
  const location = parts.locationName?.trim() || "";
  const trip = parts.tripTitle?.trim() || "";
  const tripDistinct =
    trip &&
    (!location || trip.toLowerCase() !== location.toLowerCase())
      ? trip
      : "";

  const meta = [location, tripDistinct].filter(Boolean);

  const titleHtml = rawTitle
    ? `<h4 class="lg-caption-title">${escapeHtml(rawTitle)}</h4>`
    : "";
  const dateHtml = date
    ? `<time class="lg-caption-date">${escapeHtml(date)}</time>`
    : "";
  const row =
    titleHtml || dateHtml
      ? `<div class="vc-lg-caption-row">${titleHtml}${dateHtml}</div>`
      : "";
  const metaHtml =
    meta.length > 0
      ? `<p class="lg-caption-meta">${meta
          .map((part) => escapeHtml(part))
          .join(" · ")}</p>`
      : "";

  if (!row && !metaHtml) return "";
  return `<div class="vc-lg-caption">${row}${metaHtml}</div>`;
}

function videoContentType(filename: string) {
  return contentTypeForFilename(filename) || "video/mp4";
}

/** Map app gallery items to lightGallery dynamicEl slides. */
export function toLightGalleryElements(items: GalleryItem[]): LgGalleryItem[] {
  return items.map((item) => {
    // Prefer real captions only — never fall back to the filename.
    const caption = item.description?.trim() || "";
    const subHtml = buildLightGallerySubHtml({
      title: caption,
      tripTitle: item.tripTitle,
      locationName: item.locationName,
      dateTaken: item.dateTaken,
      dateShot: item.dateShot,
    });

    if (item.type === "video") {
      return {
        thumb: item.src,
        subHtml,
        downloadUrl: item.src,
        video: {
          source: [{ src: item.src, type: videoContentType(item.filename) }],
          tracks: [],
          attributes: {
            preload: "none",
            controls: true,
            playsInline: true,
          } as unknown as HTMLVideoElement,
        },
      };
    }

    return {
      src: item.src,
      thumb: item.src,
      alt: caption || item.title,
      subHtml,
      downloadUrl: item.src,
      ...(item.width ? { width: String(item.width) } : {}),
    };
  });
}

/** Map trip Photo[] records to lightGallery dynamicEl slides. */
export function photosToLightGalleryElements(photos: Photo[]): LgGalleryItem[] {
  return photos.map((photo) => {
    const caption = photo.caption?.trim() || "";
    const subHtml = buildLightGallerySubHtml({
      title: caption,
      locationName: photo.location,
      dateTaken: photo.dateTaken,
    });
    const isVideoFile = photo.mediaType === "video";

    if (isVideoFile) {
      return {
        thumb: photo.downloadUrl,
        subHtml,
        downloadUrl: photo.downloadUrl,
        video: {
          source: [
            {
              src: photo.downloadUrl,
              type: videoContentType(photo.name),
            },
          ],
          tracks: [],
          attributes: {
            preload: "none",
            controls: true,
            playsInline: true,
          } as unknown as HTMLVideoElement,
        },
      };
    }

    return {
      src: photo.downloadUrl,
      thumb: photo.downloadUrl,
      alt: caption || photo.name,
      subHtml,
      downloadUrl: photo.downloadUrl,
      ...(photo.width ? { width: String(photo.width) } : {}),
    };
  });
}

