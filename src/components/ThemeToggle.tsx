"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = stored === "dark" || (!stored && prefersDark);
    root.classList.toggle("dark", isDark);
    setDark(isDark);
  }, []);

  const toggle = () => {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
    setDark(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(className)}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {dark ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 3a1 1 0 011 1v1a1 1 0 11-2 0V4a1 1 0 011-1zm5.657 3.343a1 1 0 010 1.414l-.707.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM21 11a1 1 0 110 2h-1a1 1 0 110-2h1zM6.343 6.343a1 1 0 011.414 0l.707.707A1 1 0 116.05 8.464l-.707-.707a1 1 0 010-1.414zM12 17a1 1 0 110 2H11a1 1 0 110-2h1zm7-6a1 1 0 011 1 6 6 0 11-6-6 1 1 0 011 1zm-5 0a4 4 0 10-8 0 4 4 0 008 0zM4 11a1 1 0 110-2H3a1 1 0 110 2h1z" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M21.752 15.002A9.72 9.72 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
        </svg>
      )}
    </button>
  );
}
