import { Suspense } from "react";
import EditPhotoPageClient from "./EditPhotoPageClient";

export default function EditPhotoPage() {
  return (
    <Suspense
      fallback={
        <div className="page-container main-offset mx-auto px-0 py-16 text-sm text-zinc-500">
          Loading…
        </div>
      }
    >
      <EditPhotoPageClient />
    </Suspense>
  );
}
