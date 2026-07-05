import { buildGalleryItems } from "@/lib/gallery";
import { listFavoriteGalleryPhotos } from "@/lib/github";
import { FavoritesGalleryPage } from "@/components/gallery/FavoritesGalleryPage";

export const dynamic = "force-dynamic";

export default async function FavoritesAlbumPage() {
  const photos = await listFavoriteGalleryPhotos();
  const items = buildGalleryItems(photos);

  return <FavoritesGalleryPage items={items} />;
}
