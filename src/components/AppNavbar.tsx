"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { MainNavLink } from "@/components/MainNavLink";
import { useNavbarConfigState } from "@/components/navbar-config";
import { cn } from "@/lib/utils";
import { mainNavItems } from "@/lib/nav-items";

type AppNavbarProps = {
  onUpload?: () => void;
};

function IconButton({
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-full border shadow-sm backdrop-blur-md transition-colors",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function AppNavbar({ onUpload }: AppNavbarProps) {
  const pathname = usePathname();
  const { backHref, backLabel } = useNavbarConfigState();
  const { isAdmin, logout, loading, authenticated } = useAuth();
  const [accountOpen, setAccountOpen] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [backupNotice, setBackupNotice] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const accountRef = useRef<HTMLDivElement | null>(null);

  const glassIcon =
    "border-zinc-200 bg-white/80 text-zinc-800 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-white dark:hover:bg-zinc-800";

  const openAccount = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setAccountOpen(true);
  };

  const closeAccount = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setAccountOpen(false), 120);
  };

  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    [],
  );

  useEffect(() => {
    if (!accountOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!accountRef.current?.contains(event.target as Node)) {
        setAccountOpen(false);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [accountOpen]);

  useEffect(() => {
    if (!backupNotice) return;
    const timer = window.setTimeout(() => setBackupNotice(null), 8000);
    return () => window.clearTimeout(timer);
  }, [backupNotice]);

  if (pathname === "/login") return null;

  const loginHref = `/login?from=${encodeURIComponent(pathname)}`;

  const handleBackup = async () => {
    if (
      !confirm(
        "Copy all objects from vacation-photos to vacation-photos-backup? This may take a while.",
      )
    ) {
      return;
    }

    setBackingUp(true);
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
      setAccountOpen(false);
    } catch (err) {
      setBackupNotice({
        type: "error",
        message: err instanceof Error ? err.message : "Backup failed",
      });
    } finally {
      setBackingUp(false);
    }
  };

  return (
    <>
      <header className="front-floating-nav front-floating-nav--solid safe-top pointer-events-none fixed inset-x-0 top-0 z-50 transition duration-200 ease-out">
        <div className="page-container mx-auto flex flex-col gap-1.5 pb-2 sm:gap-3 sm:pb-6">
          <div className="flex w-full items-center justify-between gap-2 sm:gap-3">
            {backHref ? (
              <Link
                href={backHref}
                className="pointer-events-auto group flex min-w-0 items-center gap-2 text-left text-xs font-medium uppercase tracking-[0.2em] text-zinc-600 transition-colors hover:text-zinc-900 dark:text-white/60 dark:hover:text-white"
              >
                <span
                  aria-hidden
                  className="transition-transform group-hover:-translate-x-0.5"
                >
                  ←
                </span>
                <span className="truncate">{backLabel ?? "Back"}</span>
              </Link>
            ) : (
              <Link href="/" className="pointer-events-auto min-w-0 flex-1 text-left">
                <span className="font-serif block truncate text-sm font-semibold leading-snug tracking-[0.04em] text-zinc-800/90 sm:text-base sm:leading-tight sm:tracking-[0.06em] md:text-xl lg:text-2xl dark:text-white/85">
                  <span className="sm:hidden">R&amp;R Adventures</span>
                  <span className="hidden sm:inline">
                    Ralph &amp; Robin&apos;s Great Adventures!
                  </span>
                </span>
              </Link>
            )}

            <div className="pointer-events-auto flex shrink-0 items-center justify-end gap-1.5 sm:gap-2">
              <nav className="hidden flex-wrap items-center justify-end gap-2 sm:flex">
                {mainNavItems.map((item) => {
                  const active =
                    item.href === "/"
                      ? pathname === "/"
                      : pathname.startsWith(item.href);
                  return (
                    <MainNavLink
                      key={item.href}
                      item={item}
                      active={active}
                      variant="badge"
                    />
                  );
                })}
              </nav>

              <div
                ref={accountRef}
                className="relative"
                onMouseEnter={openAccount}
                onMouseLeave={closeAccount}
              >
                <IconButton
                  className={cn(glassIcon, isAdmin && "overflow-hidden p-0")}
                  aria-label={authenticated ? "Account" : "Sign in"}
                  onClick={() => setAccountOpen((open) => !open)}
                >
                  {isAdmin ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src="/ralph.jpg"
                      alt="Admin"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                  )}
                </IconButton>

                {accountOpen && (
                  <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-zinc-200 bg-white/95 p-4 text-zinc-900 shadow-xl backdrop-blur-md dark:border-zinc-700 dark:bg-zinc-900/95 dark:text-white">
                    {loading ? (
                      <p className="text-sm text-zinc-500">Loading…</p>
                    ) : authenticated ? (
                      <div className="space-y-3">
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-500 dark:text-white/50">
                            Signed in
                          </p>
                          <p className="mt-1 text-sm font-semibold">
                            {isAdmin ? "Admin" : "Guest"}
                          </p>
                        </div>
                        {isAdmin && (
                          <Link
                            href="/trips/new"
                            onClick={() => setAccountOpen(false)}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-white/10 dark:hover:bg-white/10"
                          >
                            New trip
                          </Link>
                        )}
                        {isAdmin && onUpload && (
                          <button
                            type="button"
                            onClick={() => {
                              onUpload();
                              setAccountOpen(false);
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-white/10 dark:hover:bg-white/10"
                          >
                            Upload photos
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => void handleBackup()}
                            disabled={backingUp}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-white/10 disabled:opacity-50 dark:hover:bg-white/10"
                          >
                            {backingUp ? "Backing up…" : "Backup to R2"}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={logout}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-400 transition hover:bg-red-500/10"
                        >
                          Log out
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-sm">Browse trips or sign in as admin.</p>
                        <Link
                          href={loginHref}
                          className="flex h-9 w-full items-center justify-center rounded-full border border-zinc-900 bg-zinc-900 text-xs uppercase tracking-[0.2em] text-white transition hover:bg-zinc-800 dark:border-white dark:bg-white dark:text-zinc-900"
                        >
                          Sign in
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <nav
            className="front-nav-mobile pointer-events-auto -mx-1 flex w-[calc(100%+0.5rem)] items-stretch justify-between gap-0.5 overflow-x-auto overscroll-x-contain border-t border-border/60 px-1 pt-1.5 sm:hidden"
            aria-label="Primary"
          >
            {mainNavItems.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <MainNavLink
                  key={item.href}
                  item={item}
                  active={active}
                  variant="badge"
                  labelHidden
                  className="shrink-0 justify-center px-2.5 py-2"
                  iconClassName="h-4 w-4"
                />
              );
            })}
          </nav>
        </div>
      </header>

      {backupNotice ? (
        <div
          role="alert"
          aria-live="polite"
          className={cn(
            "pointer-events-auto fixed bottom-6 left-1/2 z-[100] w-[min(92vw,28rem)] -translate-x-1/2 rounded-2xl border px-4 py-3 shadow-xl backdrop-blur-md",
            backupNotice.type === "success"
              ? "border-emerald-300/60 bg-emerald-50/95 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-950/90 dark:text-emerald-100"
              : "border-red-300/60 bg-red-50/95 text-red-900 dark:border-red-500/40 dark:bg-red-950/90 dark:text-red-100",
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-medium leading-snug">{backupNotice.message}</p>
            <button
              type="button"
              onClick={() => setBackupNotice(null)}
              className="shrink-0 text-xs uppercase tracking-[0.15em] opacity-70 transition hover:opacity-100"
              aria-label="Dismiss"
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
