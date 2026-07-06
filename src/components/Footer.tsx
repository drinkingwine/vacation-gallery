import { FooterPageSize } from "@/components/FooterPageSize";
import { FooterNav } from "@/components/FooterNav";
import { ThemeToggle } from "@/components/ThemeToggle";

type FooterProps = {
  stats?: string;
};

export function Footer({ stats }: FooterProps) {
  return (
    <footer className="front-footer relative z-10 mt-8 border-t border-border/80 px-4 py-6 text-sm text-muted-foreground sm:px-6">
      <div className="page-container mx-auto flex w-full flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <ThemeToggle variant="badge" />
          {stats ? (
            <p className="text-xs text-muted-foreground">{stats}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FooterNav />
          <FooterPageSize />
        </div>
      </div>
    </footer>
  );
}
