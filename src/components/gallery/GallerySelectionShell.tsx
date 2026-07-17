import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type GallerySelectionShellProps = {
  title: string;
  loading?: boolean;
  empty?: boolean;
  emptyMessage?: ReactNode;
  skeletonCount?: number;
  contentClassName?: string;
  children: ReactNode;
};

export function GallerySelectionShell({
  title,
  loading = false,
  empty = false,
  emptyMessage,
  skeletonCount = 10,
  contentClassName,
  children,
}: GallerySelectionShellProps) {
  return (
    <div className="gallery-page-shell flex flex-1 flex-col">
      <main className="page-container main-offset mx-auto flex-1 px-0 pb-20">
        <div className="space-y-8 sm:space-y-10">
          <header className="front-fade-up relative max-w-3xl">
            <div
              aria-hidden
              className="pointer-events-none absolute -left-6 -top-8 h-28 w-28 rounded-full bg-rose-200/40 blur-3xl dark:bg-violet-500/20"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute left-24 -top-4 h-20 w-32 rounded-full bg-sky-200/50 blur-3xl dark:bg-teal-500/15"
            />
            <h1
              className={cn(
                "relative font-serif text-4xl font-semibold tracking-tight",
                "text-zinc-900/90 dark:text-white/90 md:text-5xl",
              )}
            >
              {title}
            </h1>
          </header>

          {loading ? (
            <div className="gallery-card-grid">
              {Array.from({ length: skeletonCount }).map((_, index) => (
                <div
                  key={index}
                  className="aspect-square animate-pulse rounded-2xl bg-white/55 shadow-sm dark:bg-white/10"
                  style={{ animationDelay: `${index * 40}ms` }}
                />
              ))}
            </div>
          ) : empty ? (
            <div className="rounded-3xl border border-white/60 bg-white/50 px-8 py-14 text-center text-sm text-zinc-600 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-zinc-900/50 dark:text-zinc-300">
              {emptyMessage}
            </div>
          ) : (
            <div className={contentClassName ?? "gallery-card-grid"}>{children}</div>
          )}
        </div>
      </main>
    </div>
  );
}
