"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type MutableRefObject,
} from "react";
import LightGallery from "lightgallery/react";
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

export function LightGalleryViewer({
  elements,
  openIndex,
  onClose,
  onSlideChange,
  instanceRef,
}: LightGalleryViewerProps) {
  const galleryRef = useRef<LightGalleryInstance | null>(null);
  const openIndexRef = useRef(openIndex);
  const onCloseRef = useRef(onClose);
  const onSlideChangeRef = useRef(onSlideChange);
  const isOpenRef = useRef(false);
  const suppressCloseRef = useRef(false);

  openIndexRef.current = openIndex;
  onCloseRef.current = onClose;
  onSlideChangeRef.current = onSlideChange;

  const licenseKey =
    process.env.NEXT_PUBLIC_LIGHTGALLERY_LICENSE_KEY?.trim() ||
    "0000-0000-000-0000";

  const setInstance = useCallback(
    (instance: LightGalleryInstance | null) => {
      galleryRef.current = instance;
      if (instanceRef) instanceRef.current = instance;
    },
    [instanceRef],
  );

  const handleInit = useCallback(
    (detail: { instance: LightGalleryInstance }) => {
      setInstance(detail.instance);
      const index = openIndexRef.current;
      if (index !== null && index >= 0) {
        isOpenRef.current = true;
        detail.instance.openGallery(index);
      }
    },
    [setInstance],
  );

  const handleAfterSlide = useCallback((detail: { index: number }) => {
    onSlideChangeRef.current?.(detail.index);
  }, []);

  const handleAfterClose = useCallback(() => {
    isOpenRef.current = false;
    if (suppressCloseRef.current) {
      suppressCloseRef.current = false;
      return;
    }
    onCloseRef.current();
  }, []);

  useEffect(() => {
    const instance = galleryRef.current;
    if (!instance) return;

    if (openIndex === null) {
      if (isOpenRef.current) {
        suppressCloseRef.current = true;
        instance.closeGallery();
        isOpenRef.current = false;
      }
      return;
    }

    if (openIndex < 0 || openIndex >= elements.length) return;

    if (!isOpenRef.current) {
      isOpenRef.current = true;
      instance.openGallery(openIndex);
      return;
    }

    if (instance.index !== openIndex) {
      instance.slide(openIndex);
    }
  }, [openIndex, elements.length]);

  useEffect(() => {
    const instance = galleryRef.current;
    if (!instance || !isOpenRef.current) return;
    try {
      instance.refresh(elements);
    } catch {
      // Instance may already be tearing down during route changes.
    }
  }, [elements]);

  // Let lightgallery/react own destroy — calling destroy() here races React's
  // unmount and throws removeChild on a null parent.

  const stablePlugins = useMemo(() => PLUGINS, []);

  if (elements.length === 0) return null;

  return (
    <LightGallery
      dynamic
      dynamicEl={elements}
      plugins={stablePlugins}
      addClass="vc-lightgallery"
      mode="lg-fade"
      easing="cubic-bezier(0.22, 1, 0.36, 1)"
      speed={480}
      backdropDuration={320}
      hideBarsDelay={2800}
      hideScrollbar
      loop
      mousewheel
      preload={2}
      showCloseIcon
      counter
      download
      closable
      swipeToClose
      enableDrag
      enableSwipe
      actualSize
      showZoomInOutIcons
      scale={1}
      actualSizeIcons={{
        zoomIn: "lg-zoom-in",
        zoomOut: "lg-actual-size",
      }}
      thumbnail
      animateThumb
      allowMediaOverlap={false}
      toggleThumb
      alignThumbnails="middle"
      currentPagerPosition="middle"
      thumbWidth={96}
      thumbHeight="72px"
      thumbMargin={10}
      enableThumbDrag
      enableThumbSwipe
      fullScreen
      rotate
      rotateLeft
      rotateRight
      flipHorizontal
      flipVertical
      autoplayVideoOnSlide={false}
      mobileSettings={{
        controls: true,
        showCloseIcon: true,
        download: true,
        rotate: false,
        toggleThumb: true,
      }}
      licenseKey={licenseKey}
      onInit={handleInit}
      onAfterSlide={handleAfterSlide}
      onAfterClose={handleAfterClose}
      elementClassNames="vc-lightgallery-root"
    />
  );
}
