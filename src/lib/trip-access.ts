import type { Session } from "@/lib/auth";
import {
  getTripMetadata,
  listContents,
  patchTripMetadata,
} from "@/lib/github";
import type { TripAccess } from "@/lib/types";

export type TripAccessSource = {
  name: string;
  access?: TripAccess;
};

/** Parse access from a PATCH/create body; returns undefined if absent/invalid. */
export function parseTripAccess(value: unknown): TripAccess | undefined {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  if (typeof record.guest !== "boolean") return undefined;
  const ids = Array.isArray(record.familyUserIds)
    ? record.familyUserIds.filter(
        (id): id is string => typeof id === "string" && id.length > 0,
      )
    : [];
  return {
    guest: record.guest,
    familyUserIds: [...new Set(ids)],
  };
}

/**
 * Edit-form defaults: unset access = guest on + every known family user selected.
 */
export function normalizeTripAccess(
  access: TripAccess | undefined,
  allFamilyUserIds: string[],
): TripAccess {
  if (!access) {
    return {
      guest: true,
      familyUserIds: [...allFamilyUserIds],
    };
  }
  return {
    guest: access.guest,
    familyUserIds: [...new Set(access.familyUserIds)],
  };
}

export function canViewTrip(
  trip: TripAccessSource,
  session: Session | null,
): boolean {
  if (!session) return false;
  if (session.role === "admin") return true;

  const access = trip.access;
  // Legacy / unset: open to guest and all family.
  if (!access) return true;

  if (session.role === "guest") return access.guest === true;

  if (session.role === "family") {
    return Boolean(
      session.userId && access.familyUserIds.includes(session.userId),
    );
  }

  return false;
}

export function filterTripsForSession<T extends TripAccessSource>(
  trips: T[],
  session: Session | null,
): T[] {
  if (session?.role === "admin") return trips;
  return trips.filter((trip) => canViewTrip(trip, session));
}

export function visibleTripNames(
  trips: TripAccessSource[],
  session: Session | null,
): Set<string> {
  return new Set(
    filterTripsForSession(trips, session).map((trip) => trip.name),
  );
}

export function filterPhotosByTripAccess<T extends { tripName: string }>(
  photos: T[],
  allowedTripNames: Set<string>,
): T[] {
  return photos.filter((photo) => allowedTripNames.has(photo.tripName));
}

export function sessionCacheIdentity(session: Session | null): string {
  if (!session) return "anon";
  if (session.role === "admin") return "admin";
  if (session.role === "family") {
    return `family:${session.userId ?? session.username ?? "unknown"}`;
  }
  return "guest";
}

/**
 * Ensure a newly created family user can see every trip.
 * Trips with no access field already allow all family users.
 * Trips with explicit access get this user id added to familyUserIds.
 */
export async function grantFamilyUserAccessToAllTrips(
  userId: string,
): Promise<void> {
  if (!userId.trim()) return;

  const items = await listContents("");
  const tripDirs = items.filter((item) => item.type === "dir");

  await Promise.all(
    tripDirs.map(async (dir) => {
      const metadata = await getTripMetadata(dir.path);
      const access = metadata.access;
      if (!access) return;
      if (access.familyUserIds.includes(userId)) return;

      await patchTripMetadata(dir.name, {
        access: {
          guest: access.guest,
          familyUserIds: [...access.familyUserIds, userId],
        },
      });
    }),
  );
}

