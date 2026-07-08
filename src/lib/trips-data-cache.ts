export {
  getCachedTrips,
  invalidateGalleryHomeCache as invalidateTripsCache,
  loadTrips,
  prefetchGalleryHome as prefetchTrips,
  prefetchGalleryHomeWhenIdle as prefetchTripsWhenIdle,
} from "@/lib/gallery-home-cache";
