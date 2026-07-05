"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useSwipeable } from "react-swipeable";
import { BlurImage } from "@/components/gallery/BlurImage";
import type { GalleryItem } from "@/lib/gallery";
import { cn } from "@/lib/utils";

type PhotoMediaCanvasProps = {
  item: GalleryItem;
  direction: number;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
};

export function PhotoMediaCanvas({
  item,
  direction,
  onPrev,
  onNext,
  hasPrev = false,
  hasNext = false,
}: PhotoMediaCanvasProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canNavigate = hasPrev || hasNext;
  const isVideo = item.type === "video";

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

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isVideo) return;

    video.load();
    void video.play().catch(() => {});

    return () => {
      video.pause();
    };
  }, [isVideo, item.id, item.src]);

  const handleCanvasClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("video")) return;
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

  const hasDimensions = !!(item.width && item.height);
  const useShrinkWrap = hasDimensions && !isVideo;

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
        canNavigate && !isVideo && "cursor-pointer",
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
          className="absolute inset-0 flex h-full w-full items-center justify-center px-3 py-2 sm:px-4 sm:py-0"
        >
          {isVideo ? (
            <video
              ref={videoRef}
              src={item.src}
              controls
              playsInline
              preload="auto"
              className={cn(
                "max-h-[42dvh] w-auto max-w-[82vw] object-contain sm:max-h-[calc(100dvh-10rem)] sm:max-w-full md:max-h-[75vh]",
              )}
              onClick={(event) => event.stopPropagation()}
            />
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
                    ? cn(
                        "block h-auto w-auto",
                        mobileMaxHeight,
                        mobileMaxWidth,
                        desktopMaxHeight,
                        desktopMaxWidth,
                      )
                    : cn(
                        mobileMaxHeight,
                        mobileMaxWidth,
                        desktopMaxHeight,
                        desktopMaxWidth,
                      ),
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
