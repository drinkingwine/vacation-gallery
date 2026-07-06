import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/server-auth";
import { NewTripForm } from "./NewTripForm";

export const dynamic = "force-dynamic";

export default async function NewTripPage() {
  const session = await requireAdminSession();
  if (!session) {
    redirect("/login?from=/trips/new");
  }

  return <NewTripForm />;
}
