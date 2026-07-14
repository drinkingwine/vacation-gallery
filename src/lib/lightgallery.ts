import lightGallery from "lightgallery";
import type { LightGallerySettings } from "lightgallery/lg-settings";
import type { LightGallery as LightGalleryInstance } from "lightgallery/lightgallery";

const TRIAL_LICENSE_KEY = "0000-0000-000-0000";
const LICENSE_WARN =
  "license key is not valid for production use";

let playPatchInstalled = false;

/** Swallow benign AbortError when lightGallery pauses during an in-flight play(). */
function installQuietMediaPlay() {
  if (playPatchInstalled || typeof HTMLMediaElement === "undefined") return;
  playPatchInstalled = true;

  const originalPlay = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function play(
    this: HTMLMediaElement,
    ...args: Parameters<HTMLMediaElement["play"]>
  ) {
    const result = originalPlay.apply(this, args);
    if (result && typeof result.then === "function") {
      return result.catch((error: unknown) => {
        if (
          error instanceof DOMException &&
          (error.name === "AbortError" || error.name === "NotAllowedError")
        ) {
          return undefined;
        }
        throw error;
      }) as Promise<void>;
    }
    return result;
  };
}

export function getLightGalleryLicenseKey() {
  return (
    process.env.NEXT_PUBLIC_LIGHTGALLERY_LICENSE_KEY?.trim() || TRIAL_LICENSE_KEY
  );
}

/** Create a lightGallery instance without the trial-key console.warn spam. */
export function createLightGallery(
  element: HTMLElement,
  options: Partial<LightGallerySettings>,
): LightGalleryInstance {
  installQuietMediaPlay();

  const warn = console.warn;
  console.warn = (...args: unknown[]) => {
    const first = args[0];
    if (typeof first === "string" && first.includes(LICENSE_WARN)) return;
    warn.apply(console, args as Parameters<typeof console.warn>);
  };
  try {
    return lightGallery(element, {
      ...options,
      licenseKey: options.licenseKey ?? getLightGalleryLicenseKey(),
    });
  } finally {
    console.warn = warn;
  }
}
