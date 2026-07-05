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
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
};

export function PhotoMediaCanvas({
  item,
  direction,
  viewMode,
  onPrev,
  onNext,
  hasPrev = false,
  hasNext = false,
}: PhotoMediaCanvasProps) {
  const isFrame = viewMode === "frame";
  const canNavigate = hasPrev || hasNext;
  const swipeHandlers = useSwipeable({
    trackTouch: true,
    trackMouse: false,
    preventScrollOnSwipe: true,
    onSwipedLeft: () => {
      if (hasNext) onNext?.();
    },
    onSwipedRight: () => {
      if (hasPrev) onPrev?.();
    },
  });

  const handleCanvasClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!canNavigate) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    if (ratio < 0.35 && hasPrev) {
      onPrev?.();
      return;
    }
    if (hasNext) {
      onNext?.();
      return;
    }
    if (hasPrev) onPrev?.();
  };

  const safeWidth = item.width || 1920;
  const safeHeight = item.height || 1080;
  const hasDimensions = !!(item.width && item.height);
  const useShrinkWrap = !isFrame && hasDimensions;

  const mobileMaxHeight = "max-h-[42dvh]";
  const mobileMaxWidth = "max-w-[82vw]";
  const desktopMaxHeight = "sm:max-h-[calc(100dvh-10rem)] md:max-h-[75vh]";
  const desktopMaxWidth = "sm:max-w-full";

  return (
    <div
      {...swipeHandlers}
      onClick={handleCanvasClick}
      className={cn(
        "relative flex h-full w-full items-center justify-center overflow-hidden transition-colors duration-500",
        canNavigate && "cursor-pointer",
        isFrame &&
          "bg-gradient-to-br from-amber-100 via-rose-100 to-sky-200 dark:from-violet-950 dark:via-indigo-950 dark:to-teal-950",
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
            isFrame ? "p-3 sm:p-4 md:p-8" : "px-3 py-2 sm:px-4 sm:py-0",
          )}
        >
          {isFrame ? (
            <div className="flex w-full max-w-[min(88vw,360px)] min-w-0 flex-col items-center bg-white px-[6%] pb-[8%] pt-[4%] shadow-[0_10px_50px_-10px_rgba(0,0,0,0.1)] sm:min-w-[300px] sm:max-w-none dark:bg-[#1a1a1a]">
              <div className="relative shadow-[0_4px_20px_-2px_rgba(0,0,0,0.15)]">
                <BlurImage
                  src={item.src}
                  alt={item.title}
                  blurHash={item.blurHash}
                  width={safeWidth}
                  height={safeHeight}
                  quality={90}
                  className={cn(
                    "block w-auto object-contain",
                    mobileMaxHeight,
                    mobileMaxWidth,
                    "sm:max-h-[55vh] md:max-h-[70vh]",
                  )}
                  sizes="100vw"
                  priority
                />
              </div>
              <div className="mt-4 w-full text-center sm:mt-8 md:mt-12">
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
                "relative flex items-center justify-center",
                useShrinkWrap ? "h-auto w-auto" : "h-full w-full",
                mobileMaxHeight,
                mobileMaxWidth,
                desktopMaxHeight,
                desktopMaxWidth,
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
                  "object-contain",
                  useShrinkWrap
                    ? cn("block h-auto w-auto", mobileMaxHeight, mobileMaxWidth, desktopMaxHeight, desktopMaxWidth)
                    : cn(mobileMaxHeight, mobileMaxWidth, desktopMaxHeight, desktopMaxWidth),
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
