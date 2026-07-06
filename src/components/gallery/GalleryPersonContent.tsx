import Link from "next/link";
import { GalleryInfinite } from "@/components/gallery/GalleryInfinite";
import { buildGalleryItems } from "@/lib/gallery";
import {
  filterGalleryPhotosByTag,
  paginateGalleryPhotos,
  sortGalleryPhotos,
} from "@/lib/gallery-query";
import { galleryCopy } from "@/lib/gallery-copy";
import { listAllGalleryPhotos } from "@/lib/github";
import { galleryPhotosForPeople } from "@/lib/people-gallery";
import { formatTagLabel, getPresetTagColorClasses } from "@/lib/photo-tags";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 24;

type GalleryPersonContentProps = {
  tag: string;
};

export async function GalleryPersonContent({ tag }: GalleryPersonContentProps) {
  const normalizedTag = tag.trim().toLowerCase();
  const allPhotos = galleryPhotosForPeople(await listAllGalleryPhotos());
  const filtered = sortGalleryPhotos(
    filterGalleryPhotosByTag(allPhotos, normalizedTag),
    "newest",
  );
  const { items: pagePhotos, hasNext } = paginateGalleryPhotos(
    filtered,
    1,
    PAGE_SIZE,
  );
  const items = buildGalleryItems(pagePhotos);
  const label = formatTagLabel(normalizedTag);

  return (
    <div className="space-y-8">
      <header className="front-fade-up space-y-4">
        <p className="text-xs uppercase tracking-[0.4em] text-zinc-600/80 dark:text-white/60">
          {galleryCopy.people.eyebrow}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <h1
            className={cn(
              "font-serif",
              "text-4xl font-semibold text-zinc-800/90 dark:text-white/85 md:text-5xl",
            )}
          >
            {label}
          </h1>
          <span
            className={cn(
              "rounded-full border px-3 py-1 text-sm font-medium",
              getPresetTagColorClasses(normalizedTag),
            )}
          >
            {filtered.length} {filtered.length === 1 ? "photo" : "photos"}
          </span>
        </div>
        <Link
          href="/gallery/people"
          className="inline-flex text-xs uppercase tracking-[0.25em] text-zinc-500 transition hover:text-zinc-900 dark:text-white/50 dark:hover:text-white"
        >
          ← All people
        </Link>
      </header>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white/60 p-10 text-center text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300">
          {galleryCopy.people.noPhotos(label)}
        </div>
      ) : (
        <GalleryInfinite
          initialItems={items}
          initialPage={1}
          pageSize={PAGE_SIZE}
          hasNext={hasNext}
          tag={normalizedTag}
        />
      )}
    </div>
  );
}
