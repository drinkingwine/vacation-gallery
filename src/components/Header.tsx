"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

type HeaderProps = {
  backHref?: string;
  backLabel?: string;
  onUpload?: () => void;
};

export function Header({ backHref, backLabel, onUpload }: HeaderProps) {
  const pathname = usePathname();
  const onHome = pathname === "/";
  const { isAdmin, role, logout, loading } = useAuth();

  if (pathname === "/login") return null;

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200/80 bg-cream/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
        {backHref ? (
          <Link
            href={backHref}
            className="group flex w-28 items-center gap-2 text-sm font-medium text-stone-600 transition-colors hover:text-stone-900"
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
          <div className="w-28" />
        )}

        <Link
          href="/"
          className="font-display text-xl tracking-tight text-stone-900 transition-opacity hover:opacity-70"
        >
          Vacation Photos
        </Link>

        <div className="flex w-36 items-center justify-end gap-2">
          {!loading && role && (
            <span className="hidden text-xs text-stone-500 sm:inline">
              {isAdmin ? "Admin" : "Guest"}
            </span>
          )}
          {isAdmin && onUpload && (
            <button
              type="button"
              onClick={onUpload}
              className="flex items-center gap-1.5 rounded-full bg-terracotta px-3.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-terracotta/90"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z" />
              </svg>
              {onHome ? "Upload" : ""}
            </button>
          )}
          {!loading && role && (
            <button
              type="button"
              onClick={logout}
              className="rounded-full px-3 py-1.5 text-sm text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900"
            >
              Log out
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
