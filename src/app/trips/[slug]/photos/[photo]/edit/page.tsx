import { Suspense } from "react";
import EditPhotoPageClient from "./EditPhotoPageClient";

export default function EditPhotoPage() {
  return (
    <Suspense
      fallback={
        <div className="trip-page-shell flex min-h-[50vh] flex-1 flex-col">
          <div className="page-container main-offset mx-auto px-0 py-16 text-sm text-zinc-500">
            Loading…
          </div>
        </div>
      }
    >
      <EditPhotoPageClient />
    </Suspense>
  );
}
