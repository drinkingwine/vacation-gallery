"use client";

import {
  useEffect,
  useMemo,
  useRef,
  type MutableRefObject,
} from "react";
import lightGallery from "lightgallery";
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

type LightGalleryViewerProps = {
  elements: LgGalleryItem[];
  /** When non-null, open the gallery at this index. */
  openIndex: number | null;
  onClose: () => void;
  onSlideChange?: (index: number) => void;
  /** Optional external ref to the lightGallery instance. */
  instanceRef?: MutableRefObject<LightGalleryInstance | null>;
};

const PLUGINS = [lgZoom, lgThumbnail, lgVideo, lgFullscreen, lgRotate];

const LG_OPTIONS = {
  dynamic: true as const,
  hash: false as const,
  closable: true,
  swipeToClose: true,
  closeOnTap: true,
  escKey: true,
  showCloseIcon: true,
  showMaximizeIcon: false,
  plugins: PLUGINS,
  addClass: "vc-lightgallery",
  mode: "lg-fade" as const,
  easing: "cubic-bezier(0.22, 1, 0.36, 1)",
  speed: 480,
  backdropDuration: 320,
  hideBarsDelay: 2800,
  hideScrollbar: true,
  loop: true,
  mousewheel: true,
  preload: 2,
  counter: true,
  download: true,
  enableDrag: true,
  enableSwipe: true,
  actualSize: true,
  showZoomInOutIcons: true,
  scale: 1,
  actualSizeIcons: {
    zoomIn: "lg-zoom-in" as const,
    zoomOut: "lg-actual-size" as const,
  },
  thumbnail: true,
  animateThumb: true,
  allowMediaOverlap: false,
  toggleThumb: true,
  alignThumbnails: "middle" as const,
  currentPagerPosition: "middle" as const,
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
    showCloseIcon: true,
    download: true,
    rotate: false,
    toggleThumb: true,
  },
};

function slidesIdentity(elements: LgGalleryItem[]) {
  return elements
    .map((item) => item.src ?? JSON.stringify(item.video ?? null))
    .join("|");
}

export function LightGalleryViewer({
  elements,
  openIndex,
  onClose,
  onSlideChange,
  instanceRef,
}: LightGalleryViewerProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement | null>(null);
  const instanceRefInternal = useRef<LightGalleryInstance | null>(null);
  const openIndexRef = useRef(openIndex);
  const onCloseRef = useRef(onClose);
  const onSlideChangeRef = useRef(onSlideChange);
  const elementsRef = useRef(elements);
  const isOpenRef = useRef(false);
  const suppressCloseRef = useRef(false);
  const skipExternalSlideRef = useRef(false);
  const slidesKeyRef = useRef(slidesIdentity(elements));

  openIndexRef.current = openIndex;
  onCloseRef.current = onClose;
  onSlideChangeRef.current = onSlideChange;
  elementsRef.current = elements;

  const licenseKey =
    process.env.NEXT_PUBLIC_LIGHTGALLERY_LICENSE_KEY?.trim() ||
    "0000-0000-000-0000";

  const slidesKey = useMemo(() => slidesIdentity(elements), [elements]);

  // Create a long-lived LG instance once — never destroy/recreate on React re-renders.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const mount = document.createElement("div");
    mount.className = "vc-lightgallery-root";
    mount.style.display = "none";
    host.appendChild(mount);
    mountRef.current = mount;

    let cancelled = false;
    let instance: LightGalleryInstance;
    try {
      instance = lightGallery(mount, {
        ...LG_OPTIONS,
        container: document.body,
        dynamicEl: elementsRef.current,
        licenseKey,
      });
    } catch {
      if (mount.parentNode) mount.parentNode.removeChild(mount);
      return;
    }

    instanceRefInternal.current = instance;
    if (instanceRef) instanceRef.current = instance;

    const onAfterSlide = (event: Event) => {
      const detail = (event as CustomEvent<{ index: number }>).detail;
      if (!detail || typeof detail.index !== "number") return;
      skipExternalSlideRef.current = true;
      onSlideChangeRef.current?.(detail.index);
    };

    const onAfterClose = () => {
      isOpenRef.current = false;
      skipExternalSlideRef.current = false;
      if (suppressCloseRef.current) {
        suppressCloseRef.current = false;
        return;
      }
      onCloseRef.current();
    };

    const onAfterOpen = () => {
      isOpenRef.current = true;
    };

    mount.addEventListener("lgAfterSlide", onAfterSlide);
    mount.addEventListener("lgAfterClose", onAfterClose);
    mount.addEventListener("lgAfterOpen", onAfterOpen);

    // Open immediately if a slide was already selected on mount.
    const index = openIndexRef.current;
    if (index !== null && index >= 0 && index < elementsRef.current.length) {
      const raf = window.requestAnimationFrame(() => {
        if (cancelled) return;
        try {
          isOpenRef.current = true;
          instance.openGallery(index);
        } catch {
          // destroyed during Strict Mode cleanup
        }
      });
      return () => {
        cancelled = true;
        window.cancelAnimationFrame(raf);
        mount.removeEventListener("lgAfterSlide", onAfterSlide);
        mount.removeEventListener("lgAfterClose", onAfterClose);
        mount.removeEventListener("lgAfterOpen", onAfterOpen);
        instanceRefInternal.current = null;
        if (instanceRef) instanceRef.current = null;
        try {
          instance.destroy();
        } catch {
          // already destroyed
        }
        if (mount.parentNode) mount.parentNode.removeChild(mount);
        mountRef.current = null;
      };
    }

    return () => {
      cancelled = true;
      mount.removeEventListener("lgAfterSlide", onAfterSlide);
      mount.removeEventListener("lgAfterClose", onAfterClose);
      mount.removeEventListener("lgAfterOpen", onAfterOpen);
      instanceRefInternal.current = null;
      if (instanceRef) instanceRef.current = null;
      try {
        instance.destroy();
      } catch {
        // already destroyed
      }
      if (mount.parentNode) mount.parentNode.removeChild(mount);
      mountRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init once per mount
  }, [licenseKey, instanceRef]);

  // Open / close / external slide (thumb click) without recreating the gallery.
  useEffect(() => {
    const instance = instanceRefInternal.current;
    if (!instance) return;

    if (openIndex === null) {
      skipExternalSlideRef.current = false;
      if (isOpenRef.current) {
        suppressCloseRef.current = true;
        try {
          instance.closeGallery();
        } catch {
          // already closed
        }
        isOpenRef.current = false;
      }
      return;
    }

    if (openIndex < 0 || openIndex >= elements.length) return;

    if (!isOpenRef.current) {
      skipExternalSlideRef.current = false;
      isOpenRef.current = true;
      try {
        instance.openGallery(openIndex);
      } catch {
        isOpenRef.current = false;
      }
      return;
    }

    if (skipExternalSlideRef.current) {
      skipExternalSlideRef.current = false;
      return;
    }

    if (instance.index !== openIndex) {
      try {
        instance.slide(openIndex);
      } catch {
        // ignore mid-teardown
      }
    }
  }, [openIndex, elements.length]);

  // Refresh only when the actual slide set changes (URLs), not on every render.
  useEffect(() => {
    if (slidesKey === slidesKeyRef.current) return;
    slidesKeyRef.current = slidesKey;

    const instance = instanceRefInternal.current;
    if (!instance) return;
    try {
      instance.refresh(elements);
      if (isOpenRef.current) {
        const index = openIndexRef.current;
        if (index !== null && index >= 0 && index < elements.length) {
          skipExternalSlideRef.current = true;
          instance.slide(index);
        }
      }
    } catch {
      // ignore mid-teardown
    }
  }, [elements, slidesKey]);

  if (elements.length === 0) return null;

  return <div ref={hostRef} className="vc-lightgallery-host" aria-hidden />;
}
