import { PhoneCall } from "lucide-react";
import { ContactChannels } from "@/components/contact-channels";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SearchInput } from "@/components/ui/search-input";
import { CONTACT_INFO } from "@/lib/contact-info";

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

      <div className="flex shrink-0 items-center gap-1 sm:gap-4">
        {/* Search */}
        <SearchInput
          containerClassName="hidden md:block"
          type="search"
          placeholder="جستجو..."
          className="w-64"
        />

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label={CONTACT_INFO.title}
              title={CONTACT_INFO.title}
            >
              <PhoneCall className="h-5 w-5" aria-hidden="true" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            dir="rtl"
            align="start"
            sideOffset={8}
            className="w-[calc(100vw-2rem)] max-w-80 rounded-2xl p-3"
          >
            <div className="px-1 pb-3 pt-1">
              <p className="font-semibold">{CONTACT_INFO.title}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                برای ارتباط با تیم چیدمان، یکی از شناسه‌های بله را کپی کنید.
              </p>
            </div>
            <ContactChannels />
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
}
