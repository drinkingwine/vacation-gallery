import {
  createTrip,
  deletePhoto,
  getPhotosMetadata,
  getTrip,
  listPhotos,
  upsertPhotoMetadata,
} from "./github";
import { hasFavoriteTag, FAVORITE_TAG } from "./photo-tags";
import { copyMedia } from "./r2";
import type { PhotoMetaEntry } from "./types";

export const FAVORITES_TRIP_NAME = "Favorites";

export function isFavoritesTrip(tripName: string) {
  return tripName === FAVORITES_TRIP_NAME;
}

function makeUniqueFilename(name: string, used: Set<string>): string {
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

function findFavoriteFilename(
  meta: Record<string, PhotoMetaEntry>,
  sourcePath: string,
) {
  for (const [filename, entry] of Object.entries(meta)) {
    if (entry.sourcePath === sourcePath) return filename;
  }
  return null;
}

export async function ensureFavoritesTrip(): Promise<void> {
  const existing = await getTrip(FAVORITES_TRIP_NAME);
  if (existing) return;

  await createTrip({
    name: FAVORITES_TRIP_NAME,
    title: "Favorites",
    description: "Saved photos and videos from across the collection.",
  });
}

export async function isPhotoFavorited(sourcePath: string): Promise<boolean> {
  const meta = await getPhotosMetadata(FAVORITES_TRIP_NAME);
  return Boolean(findFavoriteFilename(meta, sourcePath));
}

export async function addToFavoritesTrip(source: {
  trip: string;
  path: string;
}): Promise<void> {
  if (isFavoritesTrip(source.trip)) return;

  await ensureFavoritesTrip();

  const favoritesMeta = await getPhotosMetadata(FAVORITES_TRIP_NAME);
  if (findFavoriteFilename(favoritesMeta, source.path)) return;

  const sourceFilename = source.path.split("/").pop()!;
  const sourceMeta = await getPhotosMetadata(source.trip);
  const sourceEntry = sourceMeta[sourceFilename] ?? {};

  const usedNames = new Set(
    Object.keys(favoritesMeta).map((name) => name.toLowerCase()),
  );
  const favoritesPhotos = await listPhotos(FAVORITES_TRIP_NAME);
  for (const photo of favoritesPhotos) {
    usedNames.add(photo.name.toLowerCase());
  }

  const destName = makeUniqueFilename(sourceFilename, usedNames);
  const destPath = `${FAVORITES_TRIP_NAME}/${destName}`;

  await copyMedia(source.path, destPath);

  const { sourceTrip: _st, sourcePath: _sp, ...mediaMeta } = sourceEntry;
  await upsertPhotoMetadata(FAVORITES_TRIP_NAME, destName, {
    ...mediaMeta,
    sourceTrip: source.trip,
    sourcePath: source.path,
    tags: [...new Set([...(sourceEntry.tags ?? []), FAVORITE_TAG])],
  });

  const sourceTags = sourceEntry.tags ?? [];
  if (!hasFavoriteTag(sourceTags)) {
    await upsertPhotoMetadata(source.trip, sourceFilename, {
      ...sourceEntry,
      tags: [...sourceTags, FAVORITE_TAG],
    });
  }
}

export async function removeFromFavoritesTrip(source: {
  trip: string;
  path: string;
}): Promise<void> {
  if (isFavoritesTrip(source.trip)) {
    const filename = source.path.split("/").pop()!;
    const favoritesMeta = await getPhotosMetadata(FAVORITES_TRIP_NAME);
    const entry = favoritesMeta[filename];
    const originalTrip = entry?.sourceTrip;
    const originalPath = entry?.sourcePath;

    await deletePhoto(source.path);

    if (originalTrip && originalPath) {
      const originalFilename = originalPath.split("/").pop()!;
      const sourceMeta = await getPhotosMetadata(originalTrip);
      const sourceEntry = sourceMeta[originalFilename];
      if (sourceEntry?.tags?.some((tag) => tag.toLowerCase() === FAVORITE_TAG)) {
        await upsertPhotoMetadata(originalTrip, originalFilename, {
          ...sourceEntry,
          tags: sourceEntry.tags.filter(
            (tag) => tag.toLowerCase() !== FAVORITE_TAG,
          ),
        });
      }
    }
    return;
  }

  const favoritesMeta = await getPhotosMetadata(FAVORITES_TRIP_NAME);
  const favoriteFilename = findFavoriteFilename(favoritesMeta, source.path);
  if (favoriteFilename) {
    await deletePhoto(`${FAVORITES_TRIP_NAME}/${favoriteFilename}`);
  }

  const sourceFilename = source.path.split("/").pop()!;
  const sourceMeta = await getPhotosMetadata(source.trip);
  const sourceEntry = sourceMeta[sourceFilename];
  if (sourceEntry?.tags?.some((tag) => tag.toLowerCase() === FAVORITE_TAG)) {
    await upsertPhotoMetadata(source.trip, sourceFilename, {
      ...sourceEntry,
      tags: sourceEntry.tags.filter((tag) => tag.toLowerCase() !== FAVORITE_TAG),
    });
  }
}

export async function setPhotoFavorite(source: {
  trip: string;
  path: string;
  favorite: boolean;
}): Promise<void> {
  if (source.favorite) {
    await addToFavoritesTrip(source);
  } else {
    await removeFromFavoritesTrip(source);
  }
}
