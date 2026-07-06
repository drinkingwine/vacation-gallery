import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/server-auth";
import { backupBucketToBackup } from "@/lib/r2";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST() {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Admin access required" }, { status: 401 });
  }

  try {
    const result = await backupBucketToBackup();

    if (result.copied === 0 && result.failed > 0) {
      return NextResponse.json(
        {
          error: "Backup failed",
          ...result,
        },
        { status: 500 },
      );
    }

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[API /backup]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
