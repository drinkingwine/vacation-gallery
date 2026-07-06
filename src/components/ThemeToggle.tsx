"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { navBadgeClass } from "@/lib/nav-badge-styles";
import { cn } from "@/lib/utils";

type ThemeToggleProps = {
  className?: string;
  variant?: "icon" | "badge";
};

export function ThemeToggle({ className, variant = "icon" }: ThemeToggleProps) {
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

  const label = dark ? "Light" : "Dark";
  const Icon = dark ? Sun : Moon;

  if (variant === "badge") {
    return (
      <button
        type="button"
        onClick={toggle}
        className={navBadgeClass(false, className)}
        aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      >
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span>{label}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(className)}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <Icon className="h-4 w-4" aria-hidden />
    </button>
  );
}
