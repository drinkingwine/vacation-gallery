"use client";

import { useEffect, useState } from "react";
import Image, { type ImageProps } from "next/image";
import { cn } from "@/lib/utils";

type CoverImageProps = Omit<
  ImageProps,
  "onLoad" | "onLoadingComplete" | "fill" | "width" | "height"
> & {
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
  ...props
}: CoverImageProps) {
  const [loaded, setLoaded] = useState(false);
  const isVisible = loaded || forceLoaded;

  useEffect(() => {
    setLoaded(false);
  }, [src]);

  const markLoaded = (image?: HTMLImageElement) => {
    setLoaded(true);
    onCoverLoad?.();
    if (image?.naturalWidth && image.naturalHeight) {
      onDimensions?.(image.naturalWidth, image.naturalHeight);
    }
  };

  return (
    <Image
      src={src}
      alt={alt}
      fill
      className={cn(
        "object-cover",
        "transition-opacity duration-500",
        isVisible ? "opacity-100" : "opacity-0",
        className,
      )}
      onLoad={(event) => markLoaded(event.currentTarget)}
      onError={() => markLoaded()}
      {...props}
    />
  );
}

export function coverFrameClass(loaded: boolean) {
  return cn(
    "relative mb-4 aspect-video w-full overflow-hidden rounded-xl border border-zinc-200/80 bg-zinc-200 shadow-lg",
    "dark:border-white/10 dark:bg-white/10",
    !loaded && "animate-pulse",
  );
}

export function coverCountBadgeClass() {
  return cn(
    "absolute bottom-3 right-3 z-10 rounded-full border border-amber-400/70",
    "bg-amber-100/95 px-2.5 py-1 text-[10px] font-semibold tabular-nums text-amber-950 shadow-sm",
    "dark:border-amber-500/50 dark:bg-amber-200/90 dark:text-amber-950",
  );
}
