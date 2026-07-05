import Link from "next/link";

type FooterProps = {
  stats?: string;
};

const footerLinks = [
  { label: "Home", href: "/" },
  { label: "Gallery", href: "/gallery" },
];

export function Footer({ stats }: FooterProps) {
  return (
    <footer className="front-footer relative z-10 mt-8 border-t border-zinc-200 px-6 py-6 text-sm text-zinc-600/80 dark:border-zinc-800 dark:text-white/60">
      <div className="mx-auto flex w-[88vw] max-w-none flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <p className="font-serif text-base text-zinc-900 dark:text-white">
            Vacation Photos
          </p>
          <p>Recording the meeting point of light, travel, and memory.</p>
          {stats ? (
            <p className="text-xs text-zinc-500 dark:text-white/50">{stats}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-4 text-xs uppercase tracking-[0.2em]">
          {footerLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="transition hover:text-zinc-900 dark:hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
