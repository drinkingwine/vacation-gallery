import { filterGalleryPhotosByTag } from "@/lib/gallery-query";
import { FAVORITES_TRIP_NAME, isFavoritesTrip } from "@/lib/favorites-trip";
import { pickRandomImageCoverUrl } from "@/lib/gallery-cover-random";
import {
  buildPeopleGalleryList,
  galleryPhotosForPeople,
} from "@/lib/people-gallery";
import {
  buildPlacesGalleryList,
  getPlaceSlugFromTripName,
} from "@/lib/places-gallery";
import type { PersonSummary } from "@/lib/people-gallery";
import type { PlaceSummary } from "@/lib/places-gallery";
import type { GalleryPhoto, Trip } from "@/lib/types";

/** Minimal photo fields needed to build randomized gallery home views. */
export type GalleryHomePhoto = Pick<
  GalleryPhoto,
  "downloadUrl" | "mediaType" | "tags" | "tripName"
>;

export type GalleryHomeData = {
  trips: Trip[];
  people: PersonSummary[];
  places: PlaceSummary[];
};

function applyRandomFavoritesCover(
  trips: Trip[],
  photos: GalleryHomePhoto[],
): Trip[] {
  const favoritesIndex = trips.findIndex((trip) => isFavoritesTrip(trip.name));
  if (favoritesIndex === -1) return trips;

  const favoritePhotos = photos.filter(
    (photo) => photo.tripName === FAVORITES_TRIP_NAME,
  );
  const coverUrl = pickRandomImageCoverUrl(favoritePhotos);
  if (!coverUrl) return trips;

  return trips.map((trip, index) =>
    index === favoritesIndex ? { ...trip, coverUrl } : trip,
  );
}

function applyRandomPeopleCovers(
  people: PersonSummary[],
  photos: GalleryHomePhoto[],
): PersonSummary[] {
  const peoplePhotos = galleryPhotosForPeople(photos as GalleryPhoto[]);

  return people.map((person) => {
    const matches = filterGalleryPhotosByTag(peoplePhotos, person.tag);
    return {
      ...person,
      coverUrl: pickRandomImageCoverUrl(matches) ?? person.coverUrl,
    };
  });
}

function applyRandomPlaceCovers(
  places: PlaceSummary[],
  photos: GalleryHomePhoto[],
): PlaceSummary[] {
  const galleryPhotos = photos as GalleryPhoto[];

  return places.map((place) => {
    const placePhotos = galleryPhotos.filter(
      (photo) => getPlaceSlugFromTripName(photo.tripName) === place.slug,
    );
    return {
      ...place,
      coverUrl: pickRandomImageCoverUrl(placePhotos) ?? place.coverUrl,
    };
  });
}

export function buildGalleryHomeViews(
  trips: Trip[],
  photos: GalleryHomePhoto[],
): GalleryHomeData {
  const galleryPhotos = photos as GalleryPhoto[];

  return {
    trips: applyRandomFavoritesCover(trips, photos),
    people: applyRandomPeopleCovers(
      buildPeopleGalleryList(galleryPhotos),
      photos,
    ),
    places: applyRandomPlaceCovers(buildPlacesGalleryList(trips), photos),
  };
}
