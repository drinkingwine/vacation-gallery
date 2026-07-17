"use client";

import { useAuth } from "@/components/AuthProvider";
import { GalleryAlbumHero } from "@/components/gallery/GalleryAlbumHero";

type GuestGalleryAlbumHeroProps = React.ComponentProps<typeof GalleryAlbumHero>;

export function GuestGalleryAlbumHero(props: GuestGalleryAlbumHeroProps) {
  const { isAdmin } = useAuth();
  return <GalleryAlbumHero {...props} compact={isAdmin || props.compact} />;
}
