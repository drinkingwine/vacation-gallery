import { GalleryHeader } from "@/components/gallery/GalleryHeader";

export function GallerySkeleton() {
  return (
    <section className="pb-24">
      <div className="relative w-full space-y-8">
        <GalleryHeader />

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2 rounded-full border border-zinc-200 bg-white px-2 py-2 text-sm shadow-sm backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-900">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-8 w-16 animate-pulse rounded-full bg-zinc-100 dark:bg-zinc-800"
              />
            ))}
          </div>
        </div>

        <div className="flex gap-4">
          {[1, 2, 3, 4].map((col) => (
            <div key={col} className="flex min-w-0 flex-1 flex-col gap-4">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="w-full overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                  style={{
                    height: `${Math.floor(Math.random() * (400 - 200) + 200)}px`,
                  }}
                >
                  <div className="h-full w-full animate-pulse bg-zinc-100 dark:bg-zinc-800" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
