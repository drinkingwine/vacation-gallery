"use client";

import { useEffect, useState } from "react";
import Image, { type ImageProps } from "next/image";
import { cn } from "@/lib/utils";

type CoverImageProps = Omit<ImageProps, "onLoad" | "onLoadingComplete"> & {
  onCoverLoad?: () => void;
  onDimensions?: (width: number, height: number) => void;
  forceLoaded?: boolean;
};

export function CoverImage({
  onCoverLoad,
  onDimensions,
  forceLoaded = false,
  className,
  src,
  alt,
  width,
  height,
  ...props
}: CoverImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [layoutSize, setLayoutSize] = useState({
    width: typeof width === "number" ? width : 1600,
    height: typeof height === "number" ? height : 900,
  });
  const isVisible = loaded || forceLoaded;

  useEffect(() => {
    setLoaded(false);
    setLayoutSize({
      width: typeof width === "number" ? width : 1600,
      height: typeof height === "number" ? height : 900,
    });
  }, [height, src, width]);

  const markLoaded = (image?: HTMLImageElement) => {
    setLoaded(true);
    onCoverLoad?.();
    if (image?.naturalWidth && image.naturalHeight) {
      setLayoutSize({
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
      onDimensions?.(image.naturalWidth, image.naturalHeight);
    }
  };

  return (
    <Image
      src={src}
      alt={alt}
      width={layoutSize.width}
      height={layoutSize.height}
      className={cn(
        "block h-auto w-full",
        "transition-opacity duration-500",
        isVisible ? "opacity-100" : "opacity-0",
        className,
      )}
      onLoad={(event) => markLoaded(event.currentTarget)}
      {...props}
    />
  );
}

export function coverFrameClass(loaded: boolean) {
  return cn(
    "relative mb-4 w-full overflow-hidden rounded-xl border border-zinc-200/80 bg-zinc-200 shadow-lg",
    "dark:border-white/10 dark:bg-white/10",
    !loaded && "min-h-40 animate-pulse",
  );
}

export function coverCountBadgeClass() {
  return cn(
    "absolute bottom-3 right-3 z-10 rounded-full border border-amber-400/70",
    "bg-amber-100/95 px-2.5 py-1 text-[10px] font-semibold tabular-nums text-amber-950 shadow-sm",
    "dark:border-amber-500/50 dark:bg-amber-200/90 dark:text-amber-950",
  );
}
