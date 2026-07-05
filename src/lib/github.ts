import { hasFavoriteTag } from "./photo-tags";
import { countMedia } from "./media-count";
import { getMediaType } from "./media";
export { isImage } from "./media";
import type { MapPhotoMarker } from "./map";
import {
  deleteMedia,
  deleteMediaPrefix,
  fetchMediaForDownload,
  listMedia,
  renameMedia,
} from "./r2";
import { sortTripsByDateDesc, tripLabel } from "./trip-meta";
import type {
  CreateTripInput,
  GalleryPhoto,
  Photo,
  PhotoMetaEntry,
  PhotosMetadata,
  Trip,
  TripMetadata,
  UpdatePhotoInput,
} from "./types";

const GITHUB_API = "https://api.github.com";
const TRIP_META_FILE = "trip.json";
const PHOTOS_META_FILE = "photos-meta.json";

interface GHConfig {
  token: string;
  owner: string;
  repo: string;
  branch: string;
}

interface GHItem {
  name: string;
  path: string;
  sha: string;
  size: number;
  type: "file" | "dir" | "symlink" | "submodule";
  download_url: string | null;
  content?: string;
  encoding?: string;
}

function getConfig(): GHConfig {
  const token = process.env.GITHUB_TOKEN;
  const repoEnv = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH ?? "main";

  if (!token) throw new Error("GITHUB_TOKEN environment variable is not set");
  if (!repoEnv) throw new Error("GITHUB_REPO environment variable is not set");

  const [owner, repo] = repoEnv.split("/");
  if (!owner || !repo) {
    throw new Error('GITHUB_REPO must be in "owner/repo" format');
  }

  return { token, owner, repo, branch };
}

function ghHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
  };
}

export async function listContents(path = ""): Promise<GHItem[]> {
  const { token, owner, repo, branch } = getConfig();
  const encodedPath = path
    ? `/${encodeURIComponent(path).replace(/%2F/g, "/")}`
    : "";
  const url = `${GITHUB_API}/repos/${owner}/${repo}/contents${encodedPath}?ref=${branch}`;

  const res = await fetch(url, {
    headers: ghHeaders(token),
    cache: "no-store",
  });

  if (res.status === 404) return [];
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  return Array.isArray(data) ? data : [data];
}

async function getFileContent(path: string): Promise<string | null> {
  const { token, owner, repo, branch } = getConfig();
  const encodedPath = encodeURIComponent(path).replace(/%2F/g, "/");
  const url = `${GITHUB_API}/repos/${owner}/${repo}/contents/${encodedPath}?ref=${branch}`;

  const res = await fetch(url, {
    headers: ghHeaders(token),
    cache: "no-store",
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API error ${res.status}: ${text}`);
  }

  const data = (await res.json()) as GHItem;
  if (!data.content) return null;

  return Buffer.from(data.content, "base64").toString("utf-8");
}

export async function getTripMetadata(tripPath: string): Promise<TripMetadata> {
  try {
    const raw = await getFileContent(`${tripPath}/${TRIP_META_FILE}`);
    if (!raw) return {};
    return JSON.parse(raw) as TripMetadata;
  } catch {
    return {};
  }
}

export async function getPhotosMetadata(tripPath: string): Promise<PhotosMetadata> {
  try {
    const raw = await getFileContent(`${tripPath}/${PHOTOS_META_FILE}`);
    if (!raw) return {};
    return JSON.parse(raw) as PhotosMetadata;
  } catch {
    return {};
  }
}

async function savePhotosMetadata(
  tripPath: string,
  metadata: PhotosMetadata,
): Promise<void> {
  const path = `${tripPath}/${PHOTOS_META_FILE}`;
  const hasEntries = Object.keys(metadata).length > 0;

  if (!hasEntries) {
    const items = await listContents(tripPath);
    const existing = items.find(
      (item) => item.type === "file" && item.name === PHOTOS_META_FILE,
    );
    if (existing) {
      await deleteFile(existing.path, existing.sha);
    }
    return;
  }

  const content = Buffer.from(JSON.stringify(metadata, null, 2)).toString(
    "base64",
  );
  await uploadFile(path, content, `Update photo metadata: ${tripPath}`);
}

export async function listPhotos(trip = ""): Promise<Photo[]> {
  const [media, photoMeta]: [Awaited<ReturnType<typeof listMedia>>, PhotosMetadata] =
    await Promise.all([
      listMedia(trip),
      trip ? getPhotosMetadata(trip) : Promise.resolve({} as PhotosMetadata),
    ]);

  return media.map((item) => ({
    name: item.name,
    path: item.path,
    sha: item.sha,
    downloadUrl: item.downloadUrl,
    size: item.size,
    mediaType: getMediaType(item.name) ?? "photo",
    trip: trip || undefined,
    caption: photoMeta[item.name]?.caption,
    tags: photoMeta[item.name]?.tags,
    location: photoMeta[item.name]?.location,
    latitude: photoMeta[item.name]?.latitude,
    longitude: photoMeta[item.name]?.longitude,
    dateTaken: photoMeta[item.name]?.dateTaken,
  }));
}

function resolveCoverUrl(
  photos: Photo[],
  coverPhoto?: string,
): { coverUrl: string | null; coverPhoto?: string } {
  if (coverPhoto) {
    const match = photos.find((p) => p.name === coverPhoto);
    if (match) return { coverUrl: match.downloadUrl, coverPhoto };
  }
  const fallbackPhoto =
    photos.find((p) => p.mediaType !== "video") ?? photos[0];
  const fallback = fallbackPhoto?.downloadUrl ?? null;
  return {
    coverUrl: fallback,
    coverPhoto: fallback ? fallbackPhoto?.name : undefined,
  };
}

function buildTrip(
  dir: GHItem,
  photos: Photo[],
  metadata: TripMetadata,
): Trip {
  const cover = resolveCoverUrl(photos, metadata.coverPhoto);
  const { photos: photoCount, videos: videoCount } = countMedia(photos);
  return {
    name: dir.name,
    path: dir.path,
    photoCount,
    videoCount,
    coverUrl: cover.coverUrl,
    coverPhoto: metadata.coverPhoto ?? cover.coverPhoto,
    title: metadata.title ?? tripLabel(dir.name),
    location: metadata.location,
    startDate: metadata.startDate,
    endDate: metadata.endDate,
    description: metadata.description,
  };
}

export async function listTrips(): Promise<Trip[]> {
  const items = await listContents("");
  const dirs = items.filter((item) => item.type === "dir");

  const trips = await Promise.all(
    dirs.map(async (dir): Promise<Trip> => {
      const metadata = await getTripMetadata(dir.path);
      let photos: Photo[] = [];
      try {
        photos = await listPhotos(dir.path);
      } catch (err) {
        console.error(
          `[listTrips] failed to list media for ${dir.path}:`,
          err instanceof Error ? err.message : err,
        );
      }
      return buildTrip(dir, photos, metadata);
    }),
  );

  return sortTripsByDateDesc(trips);
}

export async function listAllGalleryPhotos(): Promise<GalleryPhoto[]> {
  const trips = await listTrips();
  const photos: GalleryPhoto[] = [];

  for (const trip of trips) {
    const tripPhotos = await listPhotos(trip.path);
    for (const photo of tripPhotos) {
      photos.push({
        ...photo,
        id: photo.path,
        trip: trip.name,
        tripName: trip.name,
        tripTitle: trip.title,
        tripLocation: trip.location,
        tripStartDate: trip.startDate,
      });
    }
  }

  return photos;
}

export async function listFavoriteGalleryPhotos(): Promise<GalleryPhoto[]> {
  const photos = await listAllGalleryPhotos();
  return photos.filter((photo) => hasFavoriteTag(photo.tags));
}

export async function listGeotaggedPhotos(): Promise<MapPhotoMarker[]> {
  const photos = await listAllGalleryPhotos();

  return photos
    .filter(
      (photo) =>
        photo.mediaType !== "video" &&
        typeof photo.latitude === "number" &&
        typeof photo.longitude === "number" &&
        !Number.isNaN(photo.latitude) &&
        !Number.isNaN(photo.longitude),
    )
    .map((photo) => ({
      id: photo.path,
      path: photo.path,
      latitude: photo.latitude!,
      longitude: photo.longitude!,
      title: photo.caption?.trim() || photo.name.replace(/\.[^.]+$/, ""),
      location: photo.location,
      thumbnailUrl: photo.downloadUrl,
      tripName: photo.tripName,
      tripTitle: photo.tripTitle,
      dateTaken: photo.dateTaken,
    }));
}

export async function getFavoritesAlbumSummary() {
  const photos = await listFavoriteGalleryPhotos();
  return {
    photoCount: photos.length,
    coverUrl: photos[0]?.downloadUrl ?? null,
    coverUrls: photos.slice(0, 3).map((photo) => photo.downloadUrl),
  };
}

export async function getTrip(tripName: string): Promise<Trip | null> {
  const items = await listContents("");
  const dir = items.find((item) => item.type === "dir" && item.name === tripName);
  if (!dir) return null;

  const [photos, metadata] = await Promise.all([
    listPhotos(dir.path),
    getTripMetadata(dir.path),
  ]);

  return buildTrip(dir, photos, metadata);
}

export async function uploadFile(
  path: string,
  contentBase64: string,
  message: string,
): Promise<void> {
  const { token, owner, repo, branch } = getConfig();
  const encodedPath = encodeURIComponent(path).replace(/%2F/g, "/");
  const url = `${GITHUB_API}/repos/${owner}/${repo}/contents/${encodedPath}`;

  let sha: string | undefined;
  try {
    const check = await fetch(`${url}?ref=${branch}`, {
      headers: ghHeaders(token),
    });
    if (check.ok) {
      const data = await check.json();
      sha = data.sha;
    }
  } catch {
    // File doesn't exist yet
  }

  const body: Record<string, string> = {
    message,
    content: contentBase64,
    branch,
  };
  if (sha) body.sha = sha;

  const res = await fetch(url, {
    method: "PUT",
    headers: ghHeaders(token),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upload failed (${res.status}): ${text}`);
  }
}

function metadataPayload(input: CreateTripInput): TripMetadata {
  return {
    title: input.title ?? tripLabel(input.name),
    location: input.location,
    startDate: input.startDate,
    endDate: input.endDate,
    description: input.description,
  };
}

export async function createTrip(input: CreateTripInput): Promise<void> {
  const metadata = metadataPayload(input);
  const json = JSON.stringify(metadata, null, 2);
  const content = Buffer.from(json).toString("base64");

  await uploadFile(
    `${input.name}/${TRIP_META_FILE}`,
    content,
    `Create trip: ${input.name}`,
  );
}

export async function updateTripMetadata(
  tripName: string,
  metadata: TripMetadata,
): Promise<void> {
  const json = JSON.stringify(metadata, null, 2);
  const content = Buffer.from(json).toString("base64");
  await uploadFile(
    `${tripName}/${TRIP_META_FILE}`,
    content,
    `Update trip: ${tripName}`,
  );
}

export async function patchTripMetadata(
  tripName: string,
  patch: Partial<TripMetadata>,
): Promise<TripMetadata> {
  const existing = await getTripMetadata(tripName);
  const merged: TripMetadata = {
    ...existing,
    ...patch,
    title: patch.title ?? existing.title ?? tripLabel(tripName),
  };
  await updateTripMetadata(tripName, merged);
  return merged;
}

export async function setTripCoverPhoto(
  tripName: string,
  photoName: string,
): Promise<void> {
  const photos = await listPhotos(tripName);
  if (!photos.some((p) => p.name === photoName)) {
    throw new Error("Photo not found in this trip");
  }
  await patchTripMetadata(tripName, { coverPhoto: photoName });
}

export async function fetchPhotoForDownload(path: string) {
  return fetchMediaForDownload(path);
}

export async function renamePhoto(
  _tripName: string,
  oldPath: string,
  _oldSha: string,
  newFilename: string,
): Promise<string> {
  return renameMedia(oldPath, newFilename);
}

function normalizePhotoTags(tags?: string[]) {
  return [...new Set((tags ?? []).map((tag) => tag.trim().toLowerCase()).filter(Boolean))];
}

function prunePhotoMetaEntry(entry: PhotoMetaEntry | undefined) {
  if (!entry) return null;
  const caption = entry.caption?.trim();
  const tags = normalizePhotoTags(entry.tags);
  const location = entry.location?.trim();
  const latitude =
    typeof entry.latitude === "number" && !Number.isNaN(entry.latitude)
      ? entry.latitude
      : undefined;
  const longitude =
    typeof entry.longitude === "number" && !Number.isNaN(entry.longitude)
      ? entry.longitude
      : undefined;
  const dateTaken = entry.dateTaken?.trim();

  if (
    !caption &&
    tags.length === 0 &&
    !location &&
    latitude === undefined &&
    longitude === undefined &&
    !dateTaken
  ) {
    return null;
  }

  return {
    ...(caption ? { caption } : {}),
    ...(tags.length ? { tags } : {}),
    ...(location ? { location } : {}),
    ...(latitude !== undefined ? { latitude } : {}),
    ...(longitude !== undefined ? { longitude } : {}),
    ...(dateTaken ? { dateTaken } : {}),
  };
}

export async function upsertPhotoMetadata(
  tripPath: string,
  filename: string,
  patch: Partial<PhotoMetaEntry>,
): Promise<void> {
  const meta = await getPhotosMetadata(tripPath);
  const entry = meta[filename] ?? {};
  const next = prunePhotoMetaEntry({ ...entry, ...patch });
  if (next) meta[filename] = next;
  else delete meta[filename];
  await savePhotosMetadata(tripPath, meta);
}

export async function updatePhoto(input: UpdatePhotoInput): Promise<void> {
  const filename = input.path.split("/").pop()!;
  let currentName = filename;
  const meta = await getPhotosMetadata(input.trip);

  if (input.newName && input.newName !== filename) {
    await renamePhoto(input.trip, input.path, input.sha, input.newName);
    if (meta[filename]) {
      meta[input.newName] = meta[filename];
      delete meta[filename];
    }
    currentName = input.newName;
  }

  if (input.caption !== undefined) {
    const entry = meta[currentName] ?? {};
    const caption = input.caption.trim();
    const next = prunePhotoMetaEntry({ ...entry, caption: caption || undefined });
    if (next) meta[currentName] = next;
    else delete meta[currentName];
  }

  if (input.addTag) {
    const tag = input.addTag.trim().toLowerCase();
    if (tag) {
      const entry = meta[currentName] ?? {};
      const tags = normalizePhotoTags([...(entry.tags ?? []), tag]);
      meta[currentName] = prunePhotoMetaEntry({ ...entry, tags })!;
    }
  }

  if (input.removeTag) {
    const tag = input.removeTag.trim().toLowerCase();
    const entry = meta[currentName];
    if (entry?.tags?.length) {
      const tags = entry.tags.filter((value) => value.toLowerCase() !== tag);
      const next = prunePhotoMetaEntry({ ...entry, tags });
      if (next) meta[currentName] = next;
      else delete meta[currentName];
    }
  }

  await savePhotosMetadata(input.trip, meta);
}

export async function deleteFile(path: string, sha: string): Promise<void> {
  const { token, owner, repo, branch } = getConfig();
  const encodedPath = encodeURIComponent(path).replace(/%2F/g, "/");
  const url = `${GITHUB_API}/repos/${owner}/${repo}/contents/${encodedPath}`;

  const res = await fetch(url, {
    method: "DELETE",
    headers: ghHeaders(token),
    body: JSON.stringify({
      message: `Delete: ${path}`,
      sha,
      branch,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Delete failed (${res.status}): ${text}`);
  }
}

export async function deletePhoto(path: string): Promise<void> {
  await deleteMedia(path);

  const slash = path.lastIndexOf("/");
  if (slash === -1) return;

  const trip = path.slice(0, slash);
  const filename = path.slice(slash + 1);
  const meta = await getPhotosMetadata(trip);
  if (meta[filename]) {
    delete meta[filename];
    await savePhotosMetadata(trip, meta);
  }
}

export async function deleteTrip(tripName: string): Promise<void> {
  await deleteMediaPrefix(tripName);

  const items = await listContents(tripName);
  const files = items.filter((item) => item.type === "file");

  for (const file of files) {
    await deleteFile(file.path, file.sha);
  }
}
