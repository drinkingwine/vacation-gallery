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
};

const navItems = [
  { label: "Home", href: "/" },
  { label: "Gallery", href: "/gallery" },
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

export function Header({ backHref, backLabel, onUpload }: HeaderProps) {
  const pathname = usePathname();
  const onHome = pathname === "/";
  const onTripDetail = pathname.startsWith("/trips/");
  const { isAdmin, role, logout, loading, authenticated } = useAuth();
  const [accountOpen, setAccountOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (pathname === "/login" || onTripDetail) return null;

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

  const loginHref = `/login?from=${encodeURIComponent(pathname)}`;

  return (
    <header className="front-floating-nav fixed inset-x-0 top-0 z-50 pointer-events-none transition duration-200 ease-out">
      <div className="flex items-center justify-between px-6 pt-6">
        {backHref ? (
          <Link
            href={backHref}
            className={cn(
              "pointer-events-auto group flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] transition-colors",
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
          <Link href="/" className="pointer-events-auto flex items-center gap-3">
            <span
              className={cn(
                "font-serif text-base font-semibold tracking-[0.35em] md:text-lg",
                onHome ? "text-white/80" : "text-zinc-800/90 dark:text-white/85",
              )}
            >
              VACATIONS
            </span>
          </Link>
        )}

        <div className="pointer-events-auto flex items-center gap-2">
          <nav
            className={cn(
              "hidden items-center gap-4 text-xs uppercase tracking-[0.2em] lg:flex",
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
            className="relative"
            onMouseEnter={openAccount}
            onMouseLeave={closeAccount}
          >
            <IconButton
              className={glassIcon}
              aria-label={authenticated ? "Account" : "Sign in"}
              onClick={() => setAccountOpen((open) => !open)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
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
    </header>
  );
}
