"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CoverImage,
  coverFrameClass,
} from "@/components/gallery/CoverImage";
import { personGalleryPath, type PersonSummary } from "@/lib/people-gallery";

type PersonCardProps = {
  person: PersonSummary;
  priority?: boolean;
};

export function PersonCard({ person, priority = false }: PersonCardProps) {
  const cover = person.coverUrl;
  const [coverLoaded, setCoverLoaded] = useState(false);

  useEffect(() => {
    setCoverLoaded(false);
  }, [cover]);

  return (
    <div className="group relative mt-2 block">
      <Link href={personGalleryPath(person.tag)} className="block">
        <div className={coverFrameClass(coverLoaded)}>
          {cover ? (
            <CoverImage
              src={cover}
              alt={person.label}
              unoptimized
              priority={priority}
              sizes="(max-width: 768px) 100vw, 33vw"
              onCoverLoad={() => setCoverLoaded(true)}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl border border-zinc-200/80 bg-zinc-100 shadow-lg dark:border-white/10 dark:bg-white/10">
              <svg
                className="h-10 w-10 text-zinc-400 dark:text-zinc-500"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M21 3H3a2 2 0 00-2 2v14a2 2 0 002 2h18a2 2 0 002-2V5a2 2 0 00-2-2zm0 16H3V5h18v14zm-5-7l-3 3.72L10 13l-4 5h12l-3-3z" />
              </svg>
            </div>
          )}
          <div className="absolute bottom-3 right-3 z-10 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[10px] font-semibold tabular-nums text-white/90 backdrop-blur-md">
            {person.photoCount}
          </div>
        </div>

        <div className="px-2">
          <h2 className="line-clamp-2 text-xs font-semibold leading-snug text-zinc-800 transition-colors group-hover:text-indigo-600 dark:text-zinc-200 dark:group-hover:text-indigo-400">
            {person.label}
          </h2>
        </div>
      </Link>
    </div>
  );
}
