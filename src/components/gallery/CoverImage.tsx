"use client";

import { useEffect, useState } from "react";
import Image, { type ImageProps } from "next/image";
import { cn } from "@/lib/utils";

type CoverImageProps = Omit<ImageProps, "onLoad" | "onLoadingComplete"> & {
  onCoverLoad?: () => void;
};

export function CoverImage({
  onCoverLoad,
  className,
  src,
  alt,
  ...props
}: CoverImageProps) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
  }, [src]);

  const markLoaded = () => {
    setLoaded(true);
    onCoverLoad?.();
  };

  return (
    <Image
      src={src}
      alt={alt}
      className={cn(
        className,
        "transition-opacity duration-500",
        loaded ? "opacity-100" : "opacity-0",
      )}
      onLoad={markLoaded}
      onLoadingComplete={markLoaded}
      {...props}
    />
  );
}

export function coverPlaceholderClass(loaded: boolean) {
  return cn(
    "absolute inset-0 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-200 shadow-lg dark:border-zinc-600 dark:bg-zinc-600",
    !loaded && "animate-pulse",
  );
}

export function coverFrameClass(loaded: boolean) {
  return cn(
    "relative mb-4 aspect-video w-full overflow-hidden rounded-xl bg-zinc-200 dark:bg-zinc-600",
    !loaded && "animate-pulse",
  );
}
