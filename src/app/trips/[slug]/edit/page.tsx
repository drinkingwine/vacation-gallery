import { notFound, redirect } from "next/navigation";
import { getTrip } from "@/lib/github";
import { requireAdminSession } from "@/lib/server-auth";
import { EditTripForm } from "./EditTripForm";

export const dynamic = "force-dynamic";

type EditTripPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function EditTripPage({ params }: EditTripPageProps) {
  const { slug } = await params;
  const tripName = decodeURIComponent(slug);

  const session = await requireAdminSession();
  if (!session) {
    redirect(`/trips/${encodeURIComponent(tripName)}`);
  }

  const trip = await getTrip(tripName);
  if (!trip) notFound();

  return <EditTripForm trip={trip} />;
}
