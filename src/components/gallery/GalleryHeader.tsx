import Link from "next/link";
import { cn } from "@/lib/utils";
import { galleryCopy } from "@/lib/gallery-copy";

export function GalleryHeader() {
  return (
    <header className="front-fade-up space-y-4">
      <p className="text-xs uppercase tracking-[0.4em] text-zinc-600/80 dark:text-white/60">
        {galleryCopy.eyebrow}
      </p>
      <h1
        className={cn(
          "font-serif",
          "text-4xl font-semibold text-zinc-800/90 dark:text-white/85 md:text-5xl",
        )}
      >
        {galleryCopy.title}
      </h1>
      <p className="max-w-2xl text-sm text-zinc-600/80 dark:text-white/60">
        {galleryCopy.description}
      </p>
      <Link
        href="/gallery"
        className="inline-flex text-xs uppercase tracking-[0.25em] text-zinc-500 transition hover:text-zinc-900 dark:text-white/50 dark:hover:text-white"
      >
        ← Choose a trip
      </Link>
    </header>
  );
}
