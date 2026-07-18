import { parsePhotoTimestamp } from "@/lib/photo-timestamp";

export type MapPhotoMarker = {
  id: string;
  path: string;
  latitude: number;
  longitude: number;
  title: string;
  location?: string;
  thumbnailUrl: string;
  tripName: string;
  tripTitle: string;
  dateTaken?: string;
};

export type MapLocationMarker = {
  id: string;
  latitude: number;
  longitude: number;
  location?: string;
  photoCount: number;
  photos: MapPhotoMarker[];
};

/** ~11 m — treats nearby GPS readings as the same spot. */
const LOCATION_PRECISION = 4;

function locationKey(latitude: number, longitude: number): string {
  return `${latitude.toFixed(LOCATION_PRECISION)},${longitude.toFixed(LOCATION_PRECISION)}`;
}

function pickLocationLabel(locations: string[]): string | undefined {
  if (locations.length === 0) return undefined;

  const counts = new Map<string, number>();
  for (const location of locations) {
    counts.set(location, (counts.get(location) ?? 0) + 1);
  }

  let best = locations[0];
  let bestCount = 0;
  for (const [location, count] of counts) {
    if (count > bestCount) {
      best = location;
      bestCount = count;
    }
  }

  return best;
}

function comparePhotosByDate(a: MapPhotoMarker, b: MapPhotoMarker) {
  const timeA =
    parsePhotoTimestamp(a.dateTaken) ?? Number.POSITIVE_INFINITY;
  const timeB =
    parsePhotoTimestamp(b.dateTaken) ?? Number.POSITIVE_INFINITY;
  if (timeA !== timeB) return timeA - timeB;
  return a.title.localeCompare(b.title);
}

export function groupPhotosByLocation(
  photos: MapPhotoMarker[],
): MapLocationMarker[] {
  const groups = new Map<
    string,
    {
      latSum: number;
      lngSum: number;
      count: number;
      locations: string[];
      photos: MapPhotoMarker[];
    }
  >();

  for (const photo of photos) {
    const key = locationKey(photo.latitude, photo.longitude);
    const existing = groups.get(key);

    if (existing) {
      existing.latSum += photo.latitude;
      existing.lngSum += photo.longitude;
      existing.count += 1;
      existing.photos.push(photo);
      if (photo.location) existing.locations.push(photo.location);
      continue;
    }

    groups.set(key, {
      latSum: photo.latitude,
      lngSum: photo.longitude,
      count: 1,
      locations: photo.location ? [photo.location] : [],
      photos: [photo],
    });
  }

  return Array.from(groups.entries())
    .map(([key, group]) => ({
      id: key,
      latitude: group.latSum / group.count,
      longitude: group.lngSum / group.count,
      location: pickLocationLabel(group.locations),
      photoCount: group.count,
      photos: [...group.photos].sort(comparePhotosByDate),
    }))
    .sort((a, b) => b.photoCount - a.photoCount);
}

export function googleMapsPlaceUrl(latitude: number, longitude: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}

export function googleMapsStreetViewUrl(
  latitude: number,
  longitude: number,
): string {
  return `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${latitude},${longitude}`;
}
