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

/** Good for walks / boat rides without merging distant towns. */
export const MAP_CLUSTER_RADIUS_METERS = 500;

const EARTH_RADIUS_METERS = 6_371_000;

type Cluster = {
  latSum: number;
  lngSum: number;
  count: number;
  locations: string[];
  photos: MapPhotoMarker[];
};

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function distanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(a)));
}

function centroid(cluster: Cluster) {
  return {
    latitude: cluster.latSum / cluster.count,
    longitude: cluster.lngSum / cluster.count,
  };
}

function addToCluster(cluster: Cluster, photo: MapPhotoMarker) {
  cluster.latSum += photo.latitude;
  cluster.lngSum += photo.longitude;
  cluster.count += 1;
  cluster.photos.push(photo);
  if (photo.location) cluster.locations.push(photo.location);
}

function pickLocationLabel(locations: string[]): string | undefined {
  if (locations.length === 0) return undefined;

  const counts = new Map<string, number>();
  for (const location of locations) {
    counts.set(location, (counts.get(location) ?? 0) + 1);
  }

  let best = locations[0]!;
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

/**
 * Group geotagged photos by distance (greedy centroid clustering).
 * Photos within `radiusMeters` of a cluster centroid share one marker.
 */
export function groupPhotosByLocation(
  photos: MapPhotoMarker[],
  radiusMeters: number = MAP_CLUSTER_RADIUS_METERS,
): MapLocationMarker[] {
  const clusters: Cluster[] = [];

  const ordered = [...photos].sort(
    (a, b) =>
      a.latitude - b.latitude ||
      a.longitude - b.longitude ||
      a.id.localeCompare(b.id),
  );

  for (const photo of ordered) {
    let bestIndex = -1;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (let i = 0; i < clusters.length; i++) {
      const c = centroid(clusters[i]!);
      const d = distanceMeters(
        photo.latitude,
        photo.longitude,
        c.latitude,
        c.longitude,
      );
      if (d <= radiusMeters && d < bestDistance) {
        bestDistance = d;
        bestIndex = i;
      }
    }

    if (bestIndex >= 0) {
      addToCluster(clusters[bestIndex]!, photo);
      continue;
    }

    clusters.push({
      latSum: photo.latitude,
      lngSum: photo.longitude,
      count: 1,
      locations: photo.location ? [photo.location] : [],
      photos: [photo],
    });
  }

  return clusters
    .map((cluster, index) => {
      const c = centroid(cluster);
      return {
        id: `cluster-${index}-${c.latitude.toFixed(5)},${c.longitude.toFixed(5)}`,
        latitude: c.latitude,
        longitude: c.longitude,
        location: pickLocationLabel(cluster.locations),
        photoCount: cluster.count,
        photos: [...cluster.photos].sort(comparePhotosByDate),
      };
    })
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
