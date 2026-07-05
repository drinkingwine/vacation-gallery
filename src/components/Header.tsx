"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";

type HeaderProps = {
  backHref?: string;
  backLabel?: string;
  onUpload?: () => void;
  onCreateTrip?: () => void;
};

const navItems = [
  { label: "Home", href: "/" },
  { label: "Gallery", href: "/gallery" },
  { label: "Map", href: "/map" },
];

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

export function Header({ backHref, backLabel, onUpload, onCreateTrip }: HeaderProps) {
  const pathname = usePathname();
  const onHome = pathname === "/";
  const { isAdmin, role, logout, loading, authenticated } = useAuth();
  const [accountOpen, setAccountOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const accountRef = useRef<HTMLDivElement | null>(null);

  const glassIcon = onHome
    ? "border-white/20 bg-white/10 text-white hover:bg-white/20"
    : "border-zinc-200 bg-white/80 text-zinc-800 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-white dark:hover:bg-zinc-800";

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

  if (pathname === "/login") return null;

  const loginHref = `/login?from=${encodeURIComponent(pathname)}`;

  return (
    <header
      className={cn(
        "front-floating-nav safe-top pointer-events-none fixed inset-x-0 top-0 z-50 transition duration-200 ease-out",
        onHome
          ? ""
          : "border-b border-zinc-200/70 bg-background/95 backdrop-blur-xl dark:border-zinc-800/80",
      )}
    >
      <div className="page-container mx-auto flex flex-col gap-3 pb-5 sm:pb-6">
        <div className="flex w-full items-center justify-between gap-3">
          {backHref ? (
            <Link
              href={backHref}
              className={cn(
                "pointer-events-auto group flex min-w-0 items-center gap-2 text-left text-xs font-medium uppercase tracking-[0.2em] transition-colors",
                onHome
                  ? "text-white/70 hover:text-white"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-white/60 dark:hover:text-white",
              )}
            >
              <span
                aria-hidden
                className="transition-transform group-hover:-translate-x-0.5"
              >
                ←
              </span>
              {backLabel ?? "All trips"}
            </Link>
          ) : (
            <Link href="/" className="pointer-events-auto min-w-0 flex-1 text-left">
              <span
                className={cn(
                  "font-serif block text-xs font-semibold leading-snug tracking-[0.04em] sm:text-base sm:leading-tight sm:tracking-[0.06em] md:text-xl lg:text-2xl",
                  onHome ? "text-white/80" : "text-zinc-800/90 dark:text-white/85",
                )}
              >
                Ralph &amp; Robin&apos;s Great Adventures!
              </span>
            </Link>
          )}

          <div className="pointer-events-auto flex shrink-0 items-center justify-end gap-1.5 sm:gap-2">
            <nav
              className={cn(
                "hidden items-center gap-3 text-[10px] uppercase tracking-[0.2em] sm:flex sm:text-xs",
                onHome ? "text-white/60" : "text-zinc-600/80 dark:text-white/60",
              )}
            >
              {navItems.map((item) => {
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "transition",
                      active
                        ? onHome
                          ? "text-white"
                          : "text-zinc-900 dark:text-white"
                        : onHome
                          ? "hover:text-white"
                          : "hover:text-zinc-900 dark:hover:text-white",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <ThemeToggle className={cn(glassIcon)} />

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
                <div
                  className={cn(
                    "absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border p-4 shadow-xl backdrop-blur-md",
                    onHome
                      ? "border-white/20 bg-black/70 text-white"
                      : "border-zinc-200 bg-white/95 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900/95 dark:text-white",
                  )}
                >
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
                      {isAdmin && onCreateTrip && (
                        <button
                          type="button"
                          onClick={() => {
                            onCreateTrip();
                            setAccountOpen(false);
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-white/10 dark:hover:bg-white/10"
                        >
                          New trip
                        </button>
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
                        className={cn(
                          "flex h-9 w-full items-center justify-center rounded-full border text-xs uppercase tracking-[0.2em] transition",
                          onHome
                            ? "border-white/20 bg-white/10 hover:bg-white/20"
                            : "border-zinc-900 bg-zinc-900 text-white hover:bg-zinc-800 dark:border-white dark:bg-white dark:text-zinc-900",
                        )}
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
          className={cn(
            "pointer-events-auto flex w-full items-center justify-start gap-4 border-t pt-2 text-[10px] uppercase tracking-[0.2em] sm:hidden",
            onHome ? "border-white/10 text-white/60" : "border-zinc-200/80 text-zinc-600/80 dark:border-zinc-800 dark:text-white/60",
          )}
        >
          {navItems.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "transition",
                  active
                    ? onHome
                      ? "text-white"
                      : "text-zinc-900 dark:text-white"
                    : onHome
                      ? "hover:text-white"
                      : "hover:text-zinc-900 dark:hover:text-white",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
