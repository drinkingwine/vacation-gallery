"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useSwipeable } from "react-swipeable";
import { BlurImage } from "@/components/gallery/BlurImage";
import { galleryCopy } from "@/lib/gallery-copy";
import type { GalleryItem } from "@/lib/gallery";
import { cn } from "@/lib/utils";

type PhotoMediaCanvasProps = {
  item: GalleryItem;
  direction: number;
  viewMode: "fit" | "frame";
};

export function PhotoMediaCanvas({
  item,
  direction,
  viewMode,
}: PhotoMediaCanvasProps) {
  const isFrame = viewMode === "frame";
  const swipeHandlers = useSwipeable({ trackTouch: true, trackMouse: false });

  const safeWidth = item.width || 1920;
  const safeHeight = item.height || 1080;
  const hasDimensions = !!(item.width && item.height);
  const useShrinkWrap = !isFrame && hasDimensions;

  return (
    <div
      {...swipeHandlers}
      className={cn(
        "relative flex h-full w-full items-center justify-center overflow-hidden transition-colors duration-500",
        isFrame && "bg-[#f0f0f0] dark:bg-zinc-950",
      )}
    >
      <AnimatePresence initial={false} custom={direction} mode="wait">
        <motion.div
          key={item.id}
          custom={direction}
          variants={{
            enter: (dir: number) => ({
              x: dir >= 0 ? 80 : -80,
              opacity: 0,
              scale: 0.98,
            }),
            center: {
              x: 0,
              opacity: 1,
              scale: 1,
              transition: {
                x: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 },
                scale: { duration: 0.2 },
              },
            },
            exit: (dir: number) => ({
              x: dir >= 0 ? -80 : 80,
              opacity: 0,
              scale: 0.98,
              transition: { duration: 0.2 },
            }),
          }}
          initial="enter"
          animate="center"
          exit="exit"
          className={cn(
            "absolute inset-0 flex h-full w-full items-center justify-center",
            isFrame ? "p-4 md:p-8" : "p-0",
          )}
        >
          {isFrame ? (
            <div className="flex min-w-[300px] flex-col items-center bg-white px-[6%] pb-[8%] pt-[4%] shadow-[0_10px_50px_-10px_rgba(0,0,0,0.1)] dark:bg-[#1a1a1a]">
              <div className="relative shadow-[0_4px_20px_-2px_rgba(0,0,0,0.15)]">
                <BlurImage
                  src={item.src}
                  alt={item.title}
                  blurHash={item.blurHash}
                  width={safeWidth}
                  height={safeHeight}
                  quality={90}
                  className="block max-h-[60vh] w-auto object-contain md:max-h-[70vh]"
                  sizes="100vw"
                  priority
                />
              </div>
              <div className="mt-8 w-full text-center md:mt-12">
                <p className="font-serif text-sm font-light tracking-[0.2em] text-slate-800 dark:text-slate-300 md:text-base">
                  {item.title || galleryCopy.grid.modal.untitled}
                </p>
                <p className="mt-2 font-serif text-[10px] italic tracking-widest text-slate-800/60 dark:text-slate-300/60 md:text-[11px]">
                  {galleryCopy.grid.modal.authorPrefix}{" "}
                  {item.tripName ?? galleryCopy.grid.modal.authorFallback}
                </p>
              </div>
            </div>
          ) : (
            <div
              className={cn(
                "relative flex",
                useShrinkWrap ? "h-auto w-auto" : "h-full w-full",
              )}
            >
              <BlurImage
                src={item.src}
                alt={item.title}
                blurHash={item.blurHash}
                fill={!useShrinkWrap}
                width={useShrinkWrap ? item.width || undefined : undefined}
                height={useShrinkWrap ? item.height || undefined : undefined}
                className={cn(
                  useShrinkWrap
                    ? "block max-h-[75vh] w-auto max-w-full object-contain"
                    : "object-contain",
                )}
                sizes="100vw"
                priority
              />
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
