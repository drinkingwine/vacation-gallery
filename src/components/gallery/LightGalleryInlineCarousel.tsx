"use client";

import { useEffect, useMemo, useRef } from "react";
import type { LightGallery as LightGalleryInstance } from "lightgallery/lightgallery";
import type { GalleryItem as LgGalleryItem } from "lightgallery/lg-utils";
import lgFullscreen from "lightgallery/plugins/fullscreen";
import lgRotate from "lightgallery/plugins/rotate";
import lgThumbnail from "lightgallery/plugins/thumbnail";
import lgVideo from "lightgallery/plugins/video";
import lgZoom from "lightgallery/plugins/zoom";

import "lightgallery/css/lightgallery.css";
import "lightgallery/css/lg-zoom.css";
import "lightgallery/css/lg-thumbnail.css";
import "lightgallery/css/lg-video.css";
import "lightgallery/css/lg-fullscreen.css";
import "lightgallery/css/lg-rotate.css";

import { createLightGallery } from "@/lib/lightgallery";
import { cn } from "@/lib/utils";

type LightGalleryInlineCarouselProps = {
  elements: LgGalleryItem[];
  startIndex?: number;
  onSlideChange?: (index: number) => void;
  className?: string;
};

const PLUGINS = [lgZoom, lgThumbnail, lgVideo, lgFullscreen, lgRotate];

function slidesKey(elements: LgGalleryItem[]) {
  return elements
    .map((item) => item.src ?? JSON.stringify(item.video ?? null))
    .join("|");
}

export function LightGalleryInlineCarousel({
  elements,
  startIndex = 0,
  onSlideChange,
  className,
}: LightGalleryInlineCarouselProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<LightGalleryInstance | null>(null);
  const elementsRef = useRef(elements);
  const onSlideChangeRef = useRef(onSlideChange);
  const startIndexRef = useRef(startIndex);

  elementsRef.current = elements;
  onSlideChangeRef.current = onSlideChange;
  startIndexRef.current = startIndex;

  const key = useMemo(() => slidesKey(elements), [elements]);

  useEffect(() => {
    const host = hostRef.current;
    const slides = elementsRef.current;
    if (!host || slides.length === 0) return;

    let cancelled = false;

    // Detached mount node: React never reconciles lightGallery's DOM under here.
    const mount = document.createElement("div");
    mount.className = "vc-lg-inline-mount";
    mount.style.width = "100%";
    mount.style.height = "100%";
    host.appendChild(mount);

    const safeStart = Math.min(
      Math.max(startIndexRef.current, 0),
      Math.max(slides.length - 1, 0),
    );

    let instance: LightGalleryInstance;
    try {
      instance = createLightGallery(mount, {
        container: mount,
        dynamic: true,
        dynamicEl: slides,
        hash: false,
        closable: false,
        closeOnTap: false,
        escKey: false,
        showCloseIcon: false,
        showMaximizeIcon: true,
        appendSubHtmlTo: ".lg-item",
        slideDelay: 400,
        plugins: PLUGINS,
        addClass: "vc-lightgallery vc-lg-inline",
        mode: "lg-fade",
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        speed: 480,
        hideBarsDelay: 2800,
        hideScrollbar: true,
        loop: true,
        mousewheel: true,
        preload: 2,
        counter: true,
        download: true,
        swipeToClose: false,
        enableDrag: true,
        enableSwipe: true,
        actualSize: true,
        showZoomInOutIcons: true,
        thumbnail: true,
        animateThumb: true,
        allowMediaOverlap: false,
        toggleThumb: true,
        alignThumbnails: "middle",
        currentPagerPosition: "middle",
        thumbWidth: 96,
        thumbHeight: "72px",
        thumbMargin: 10,
        enableThumbDrag: true,
        enableThumbSwipe: true,
        fullScreen: true,
        rotate: true,
        rotateLeft: true,
        rotateRight: true,
        flipHorizontal: true,
        flipVertical: true,
        autoplayVideoOnSlide: false,
        mobileSettings: {
          controls: true,
          showCloseIcon: false,
          download: true,
          rotate: false,
          toggleThumb: true,
        },
      });
    } catch {
      if (mount.parentNode) mount.parentNode.removeChild(mount);
      return;
    }

    instanceRef.current = instance;

    const onAfterSlide = (event: Event) => {
      const detail = (event as CustomEvent<{ index: number }>).detail;
      if (detail && typeof detail.index === "number") {
        onSlideChangeRef.current?.(detail.index);
      }
    };
    mount.addEventListener("lgAfterSlide", onAfterSlide);

    const openRaf = window.requestAnimationFrame(() => {
      if (cancelled) return;
      try {
        instance.openGallery(safeStart);
      } catch {
        // Destroyed during Strict Mode remount.
      }
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(openRaf);
      mount.removeEventListener("lgAfterSlide", onAfterSlide);
      if (instanceRef.current === instance) {
        instanceRef.current = null;
      }
      try {
        instance.destroy();
      } catch {
        // already destroyed
      }
      try {
        if (mount.parentNode) mount.parentNode.removeChild(mount);
      } catch {
        // parent already gone
      }
    };
  }, [key]);

  if (elements.length === 0) return null;

  return <div ref={hostRef} className={cn("vc-lg-inline-container", className)} />;
}
