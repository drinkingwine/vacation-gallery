import lightGallery from "lightgallery";
import type { LightGallerySettings } from "lightgallery/lg-settings";
import type { LightGallery as LightGalleryInstance } from "lightgallery/lightgallery";

const TRIAL_LICENSE_KEY = "0000-0000-000-0000";
const LICENSE_WARN =
  "license key is not valid for production use";

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
