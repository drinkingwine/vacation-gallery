"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CloudUpload, FolderPlus, HardDriveDownload } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useUploadModal } from "@/components/AppShell";
import { cn } from "@/lib/utils";

export function AdminDashboard() {
  const router = useRouter();
  const { isAdmin, loading: authLoading, logout } = useAuth();
  const { openUpload } = useUploadModal();
  const [backingUp, setBackingUp] = useState(false);
  const [backupNotice, setBackupNotice] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!isAdmin) router.replace("/login?from=/dashboard");
  }, [authLoading, isAdmin, router]);

  useEffect(() => {
    if (!backupNotice) return;
    const timer = window.setTimeout(() => setBackupNotice(null), 8000);
    return () => window.clearTimeout(timer);
  }, [backupNotice]);

  const handleBackup = async () => {
    if (
      !confirm(
        "Copy all objects from vacation-photos to vacation-photos-backup? This may take a while.",
      )
    ) {
      return;
    }

    setBackingUp(true);
    setBackupNotice(null);
    try {
      const res = await fetch("/api/backup", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Backup failed");
      }

      const failedNote =
        data.failed > 0 ? ` ${data.failed} failed — check server logs.` : "";
      setBackupNotice({
        type: data.failed > 0 ? "error" : "success",
        message: `Backup complete: ${data.copied} object${data.copied !== 1 ? "s" : ""} copied to ${data.backupBucket}.${failedNote}`,
      });
    } catch (err) {
      setBackupNotice({
        type: "error",
        message: err instanceof Error ? err.message : "Backup failed",
      });
    } finally {
      setBackingUp(false);
    }
  };

  if (authLoading || !isAdmin) {
    return (
      <main className="page-container main-offset mx-auto flex flex-1 items-center justify-center px-4 pb-16">
        <p className="text-sm text-zinc-500">Loading…</p>
      </main>
    );
  }

  const actions = [
    {
      title: "New album",
      description: "Create a trip, stuff, or event folder.",
      href: "/trips/new",
      icon: FolderPlus,
    },
    {
      title: "Upload photos",
      description: "Add photos or videos to an existing album.",
      onClick: () => openUpload(),
      icon: CloudUpload,
    },
    {
      title: backingUp ? "Backing up…" : "Backup to R2",
      description: "Copy all media into the backup bucket.",
      onClick: () => void handleBackup(),
      disabled: backingUp,
      icon: HardDriveDownload,
    },
  ] as const;

  return (
    <main className="page-container main-offset mx-auto flex-1 px-4 pb-16 sm:px-0">
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500">
            Admin
          </p>
          <h1 className="font-serif text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Dashboard
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Manage albums, uploads, and backups.
          </p>
        </header>

        {backupNotice ? (
          <div
            role="alert"
            className={cn(
              "rounded-2xl border px-4 py-3 text-sm",
              backupNotice.type === "success"
                ? "border-emerald-300/60 bg-emerald-50 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-950/50 dark:text-emerald-100"
                : "border-red-300/60 bg-red-50 text-red-900 dark:border-red-500/40 dark:bg-red-950/50 dark:text-red-100",
            )}
          >
            {backupNotice.message}
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          {actions.map((action) => {
            const Icon = action.icon;
            const className = cn(
              "flex flex-col items-start gap-3 rounded-2xl border border-zinc-200 bg-white p-5 text-left shadow-sm transition",
              "hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700",
              "disabled" in action && action.disabled && "opacity-50",
            );

            const body = (
              <>
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-zinc-800 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <span>
                  <span className="block font-serif text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                    {action.title}
                  </span>
                  <span className="mt-1 block text-sm text-zinc-500 dark:text-zinc-400">
                    {action.description}
                  </span>
                </span>
              </>
            );

            if ("href" in action && action.href) {
              return (
                <Link key={action.title} href={action.href} className={className}>
                  {body}
                </Link>
              );
            }

            return (
              <button
                key={action.title}
                type="button"
                onClick={"onClick" in action ? action.onClick : undefined}
                disabled={"disabled" in action ? action.disabled : false}
                className={className}
              >
                {body}
              </button>
            );
          })}
        </div>

        <div className="border-t border-zinc-200 pt-6 dark:border-zinc-800">
          <button
            type="button"
            onClick={logout}
            className="text-sm text-red-600 transition hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
          >
            Log out
          </button>
        </div>
      </div>
    </main>
  );
}
