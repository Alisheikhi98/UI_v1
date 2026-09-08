import { Link } from "@tanstack/react-router";
import { CreditCard } from "lucide-react";

interface HeaderProps {
  title: string;
  description?: string;
}

export function Header({ title, description }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex min-h-16 items-start justify-between gap-2 border-b border-border bg-background/95 py-3 ps-16 pe-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:items-center sm:px-6">
      <div className="min-w-0 flex-1">
        <h1 className="text-lg font-semibold leading-6 text-foreground sm:text-xl">{title}</h1>
        {description && (
          <p className="mt-0.5 text-xs leading-5 text-muted-foreground sm:text-sm">{description}</p>
        )}
      </div>

      <Link
        to="/dashboard/subscription"
        className="flex min-w-0 max-w-44 shrink-0 items-center gap-2 rounded-xl border border-border/70 bg-card px-2.5 py-2 text-start shadow-sm transition-colors hover:border-primary/35 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:max-w-56 sm:px-3"
        aria-label="مشاهده طرح و اشتراک"
      >
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <CreditCard className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-xs font-semibold text-foreground sm:text-sm">
            طرح و اشتراک
          </span>
          <span className="block truncate text-[10px] leading-4 text-muted-foreground sm:text-xs">
            وضعیت اشتراک در دسترس نیست
          </span>
        </span>
      </Link>
    </header>
  );
}
