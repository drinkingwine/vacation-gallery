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
import {
  buildThingsGalleryList,
  galleryPhotosForThings,
} from "@/lib/things-gallery";
import {
  buildStuffGalleryList,
  galleryPhotosForStuff,
} from "@/lib/stuff-gallery";
import {
  buildEventsGalleryList,
  galleryPhotosForEvents,
} from "@/lib/events-gallery";
import { isTripEvent } from "@/lib/event-kind";
import type { PersonSummary } from "@/lib/people-gallery";
import type { PlaceSummary } from "@/lib/places-gallery";
import type { ThingSummary } from "@/lib/things-gallery";
import { sortTripsWithFavoritesFirst } from "@/lib/trip-meta";
import type { GalleryPhoto, Trip } from "@/lib/types";

/** Minimal photo fields needed to build randomized gallery home views. */
export type GalleryHomePhoto = Pick<
  GalleryPhoto,
  | "downloadUrl"
  | "mediaType"
  | "tags"
  | "tripName"
  | "tripTitle"
  | "tripLocation"
  | "location"
  | "dateTaken"
>;

export type GalleryHomeData = {
  trips: Trip[];
  people: PersonSummary[];
  places: PlaceSummary[];
  things: ThingSummary[];
  stuff: Trip[];
  events: Trip[];
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

function applyRandomThingCovers(
  things: ThingSummary[],
  photos: GalleryHomePhoto[],
): ThingSummary[] {
  const thingPhotos = galleryPhotosForThings(photos as GalleryPhoto[]);

  return things.map((thing) => {
    const matches = filterGalleryPhotosByTag(thingPhotos, thing.tag);
    return {
      ...thing,
      coverUrl: pickRandomImageCoverUrl(matches) ?? thing.coverUrl,
    };
  });
}

function applyRandomStuffCovers(
  stuff: Trip[],
  photos: GalleryHomePhoto[],
): Trip[] {
  const galleryPhotos = photos as GalleryPhoto[];

  return stuff.map((trip) => {
    const matches = galleryPhotosForStuff(galleryPhotos, trip.name);
    return {
      ...trip,
      coverUrl: pickRandomImageCoverUrl(matches) ?? trip.coverUrl,
    };
  });
}

function applyRandomEventCovers(
  events: Trip[],
  photos: GalleryHomePhoto[],
): Trip[] {
  const galleryPhotos = photos as GalleryPhoto[];

  return events.map((trip) => {
    const matches = galleryPhotosForEvents(galleryPhotos, trip.name);
    return {
      ...trip,
      coverUrl: pickRandomImageCoverUrl(matches) ?? trip.coverUrl,
    };
  });
}

export function buildGalleryHomeViews(
  trips: Trip[],
  photos: GalleryHomePhoto[],
): GalleryHomeData {
  const galleryPhotos = photos as GalleryPhoto[];
  const tripEvents = trips.filter(
    (trip) => isFavoritesTrip(trip.name) || isTripEvent(trip),
  );

  return {
    trips: sortTripsWithFavoritesFirst(
      applyRandomFavoritesCover(tripEvents, photos),
    ),
    people: applyRandomPeopleCovers(
      buildPeopleGalleryList(galleryPhotos),
      photos,
    ),
    places: applyRandomPlaceCovers(buildPlacesGalleryList(trips), photos),
    things: applyRandomThingCovers(
      buildThingsGalleryList(galleryPhotos),
      photos,
    ),
    stuff: applyRandomStuffCovers(buildStuffGalleryList(trips), photos),
    events: applyRandomEventCovers(buildEventsGalleryList(trips), photos),
  };
}
