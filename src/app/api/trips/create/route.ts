import { NextRequest, NextResponse } from "next/server";
import { FAVORITES_TRIP_NAME } from "@/lib/favorites-trip";
import { createTrip } from "@/lib/github";
import type { CreateTripInput } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const name =
      typeof body.name === "string"
        ? body.name
            .trim()
            .replace(/[^a-zA-Z0-9\s\-_]/g, "")
            .replace(/\s+/g, "-")
        : "";

    if (!name) {
      return NextResponse.json({ error: "Trip name is required" }, { status: 400 });
    }

    if (name === FAVORITES_TRIP_NAME) {
      return NextResponse.json(
        { error: `"${FAVORITES_TRIP_NAME}" is a reserved trip name` },
        { status: 400 },
      );
    }

    const input: CreateTripInput = {
      name,
      title: typeof body.title === "string" ? body.title.trim() : undefined,
      location:
        typeof body.location === "string" ? body.location.trim() : undefined,
      latitude: typeof body.latitude === "number" ? body.latitude : undefined,
      longitude: typeof body.longitude === "number" ? body.longitude : undefined,
      startDate:
        typeof body.startDate === "string" ? body.startDate.trim() : undefined,
      endDate: typeof body.endDate === "string" ? body.endDate.trim() : undefined,
      description:
        typeof body.description === "string" ? body.description.trim() : undefined,
    };

    await createTrip(input);
    return NextResponse.json({ ...input, path: name });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[API /trips/create]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
