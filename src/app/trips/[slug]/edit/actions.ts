"use server";

import { redirect } from "next/navigation";
import { getTrip, patchTripMetadata } from "@/lib/github";
import { requireAdminSession } from "@/lib/server-auth";

export type EditTripFormState = {
  error?: string;
};

export async function updateTripAction(
  _prev: EditTripFormState | null,
  formData: FormData,
): Promise<EditTripFormState | null> {
  const session = await requireAdminSession();
  if (!session) {
    return { error: "Admin access required" };
  }

  const tripName = String(formData.get("tripName") ?? "").trim();
  if (!tripName) {
    return { error: "Trip not found" };
  }

  const trip = await getTrip(tripName);
  if (!trip) {
    return { error: "Trip not found" };
  }

  const title = String(formData.get("title") ?? "").trim();
  if (!title) {
    return { error: "Title is required" };
  }

  try {
    await patchTripMetadata(tripName, {
      title,
      location: String(formData.get("location") ?? "").trim() || undefined,
      startDate: String(formData.get("startDate") ?? "").trim() || undefined,
      endDate: String(formData.get("endDate") ?? "").trim() || undefined,
      description:
        String(formData.get("description") ?? "").trim() || undefined,
    });
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Save failed",
    };
  }

  redirect(`/trips/${encodeURIComponent(tripName)}`);
}
