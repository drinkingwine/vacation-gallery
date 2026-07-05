import Link from "next/link";
import { FooterPageSize } from "@/components/FooterPageSize";

type FooterProps = {
  stats?: string;
};

const footerLinks = [
  { label: "Home", href: "/" },
  { label: "Gallery", href: "/gallery" },
  { label: "Map", href: "/map" },
];

export function Footer({ stats }: FooterProps) {
  return (
    <footer className="front-footer relative z-10 mt-8 border-t border-border/80 px-6 py-6 text-sm text-muted-foreground">
      <div className="page-container mx-auto flex w-full flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <p className="font-serif text-base text-foreground">
            Ralph &amp; Robin&apos;s Great Adventures!
          </p>
          {stats ? (
            <p className="text-xs text-muted-foreground">{stats}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs uppercase tracking-[0.2em]">
          <FooterPageSize />
          {footerLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="transition hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
