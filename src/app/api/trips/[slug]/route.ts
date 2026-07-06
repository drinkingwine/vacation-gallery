import { NextRequest, NextResponse } from "next/server";
import { deleteTrip, getTrip, getTripMetadata, patchTripMetadata } from "@/lib/github";
import { FAVORITES_TRIP_NAME } from "@/lib/favorites-trip";
import { tripLabel } from "@/lib/trip-meta";
import type { TripMetadata } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const trip = await getTrip(decodeURIComponent(slug));

    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    return NextResponse.json(trip);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[API /trips/[slug]]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const tripName = decodeURIComponent(slug);
    if (tripName === FAVORITES_TRIP_NAME) {
      return NextResponse.json(
        { error: `"${FAVORITES_TRIP_NAME}" cannot be deleted` },
        { status: 400 },
      );
    }

    const trip = await getTrip(tripName);

    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    await deleteTrip(tripName);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[API /trips/[slug] DELETE]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const tripName = decodeURIComponent(slug);
    const trip = await getTrip(tripName);

    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    const body = await req.json();
    const existing = await getTripMetadata(tripName);
    const metadata: TripMetadata = {
      ...existing,
      title:
        typeof body.title === "string" && body.title.trim()
          ? body.title.trim()
          : tripLabel(tripName),
      location:
        typeof body.location === "string" ? body.location.trim() || undefined : undefined,
      latitude: typeof body.latitude === "number" ? body.latitude : undefined,
      longitude: typeof body.longitude === "number" ? body.longitude : undefined,
      startDate:
        typeof body.startDate === "string" ? body.startDate.trim() || undefined : undefined,
      endDate:
        typeof body.endDate === "string" ? body.endDate.trim() || undefined : undefined,
      description:
        typeof body.description === "string"
          ? body.description.trim() || undefined
          : undefined,
    };

    await patchTripMetadata(tripName, metadata);
    return NextResponse.json({ success: true, ...metadata });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[API /trips/[slug] PATCH]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
