import { NextResponse } from "next/server";
import { listTrips } from "@/lib/github";
import { getServerSession } from "@/lib/server-auth";
import { filterTripsForSession } from "@/lib/trip-access";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession();
    const trips = filterTripsForSession(await listTrips(), session);
    return NextResponse.json(trips);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[API /trips]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
