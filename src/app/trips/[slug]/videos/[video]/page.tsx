import { Suspense } from "react";
import WatchVideoPageClient from "./WatchVideoPageClient";

export default function WatchVideoPage() {
  return (
    <Suspense
      fallback={
        <div className="trip-page-shell flex min-h-[50vh] flex-1 flex-col bg-[#12100e]">
          <div className="page-container main-offset mx-auto px-0 py-16 text-sm text-white/50">
            Loading…
          </div>
        </div>
      }
    >
      <WatchVideoPageClient />
    </Suspense>
  );
}
