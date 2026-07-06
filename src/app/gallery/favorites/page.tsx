import { redirect } from "next/navigation";
import { FAVORITES_TRIP_NAME } from "@/lib/favorites-trip";

export default function FavoritesAlbumPage() {
  redirect(`/trips/${encodeURIComponent(FAVORITES_TRIP_NAME)}`);
}
