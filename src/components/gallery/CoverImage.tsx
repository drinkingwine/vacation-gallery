"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

function isImageReady(image: HTMLImageElement | null | undefined) {
  return Boolean(image?.complete && image.naturalWidth > 0);
}

export function CoverImage({
  onCoverLoad,
  onDimensions,
  forceLoaded = false,
  className,
  src,
  alt,
  ...props
}: CoverImageProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);
  const isVisible = loaded || forceLoaded;

  const markLoaded = useCallback(
    (image?: HTMLImageElement | null) => {
      setLoaded(true);
      onCoverLoad?.();
      const el = image ?? imgRef.current;
      if (el?.naturalWidth && el.naturalHeight) {
        onDimensions?.(el.naturalWidth, el.naturalHeight);
      }
    },
    [onCoverLoad, onDimensions],
  );

  const syncLoadedFromCache = useCallback(() => {
    if (isImageReady(imgRef.current)) {
      markLoaded(imgRef.current);
    }
  }, [markLoaded]);

  useEffect(() => {
    setLoaded(false);
    syncLoadedFromCache();
  }, [src, syncLoadedFromCache]);

  const handleRef = useCallback(
    (node: HTMLImageElement | null) => {
      imgRef.current = node;
      if (isImageReady(node)) {
        markLoaded(node);
      }
    },
    [markLoaded],
  );

  return (
    <Image
      ref={handleRef}
      src={src}
      alt={alt}
      fill
      className={cn(
        "object-contain object-center",
        "transition-all duration-500 ease-out",
        "group-hover:scale-[1.03]",
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
    "relative mb-3 aspect-square w-full overflow-hidden rounded-2xl",
    "border border-white/70 bg-zinc-100/90 shadow-[0_10px_30px_-12px_rgba(24,24,27,0.35)]",
    "ring-1 ring-zinc-900/5 transition duration-500 ease-out",
    "group-hover:-translate-y-1 group-hover:shadow-[0_18px_40px_-14px_rgba(24,24,27,0.4)]",
    "dark:border-white/10 dark:bg-zinc-900/70 dark:ring-white/10",
    !loaded && "animate-pulse",
  );
}

export function coverCountBadgeClass() {
  return cn(
    "absolute bottom-2.5 right-2.5 z-10 rounded-full",
    "border border-white/50 bg-zinc-950/55 px-2.5 py-1",
    "text-[10px] font-semibold tabular-nums tracking-wide text-white backdrop-blur-md",
    "shadow-sm dark:border-white/20 dark:bg-black/55",
  );
}

export function coverCardLabelClass() {
  return cn(
    "mt-0.5 line-clamp-2 font-serif text-sm font-medium leading-snug tracking-tight",
    "text-zinc-800 transition-colors duration-300",
    "group-hover:text-zinc-950 dark:text-zinc-100 dark:group-hover:text-white",
  );
}

export function coverCardMetaClass() {
  return "mt-0.5 line-clamp-1 text-[11px] tracking-wide text-zinc-500 dark:text-zinc-400";
}
