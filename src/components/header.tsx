import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

interface HeaderProps {
  title: string;
  description?: string;
}

export function Header({ title, description }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex flex-col">
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>

      <div className="flex items-center gap-4">
        {/* Search */}
        <SearchInput
          containerClassName="hidden md:block"
          type="search"
          placeholder="جستجو..."
          className="w-64"
        />

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <Badge className="absolute -left-1 -top-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center">
                ۳
              </Badge>
              <span className="sr-only">اعلان‌ها</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-80">
            <DropdownMenuLabel>اعلان‌ها</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="flex flex-col items-start gap-1 py-3">
              <p className="text-sm font-medium">تداخل برنامه شناسایی شد</p>
              <p className="text-xs text-muted-foreground">
                شنبه ۱۰:۰۰ - فیزیک و ریاضی همزمان شده‌اند
              </p>
            </DropdownMenuItem>
            <DropdownMenuItem className="flex flex-col items-start gap-1 py-3">
              <p className="text-sm font-medium">ترم جدید به زودی شروع می‌شود</p>
              <p className="text-xs text-muted-foreground">
                ۵ روز تا نهایی‌سازی برنامه‌ها باقی مانده
              </p>
            </DropdownMenuItem>
            <DropdownMenuItem className="flex flex-col items-start gap-1 py-3">
              <p className="text-sm font-medium">برنامه‌های پایه ۹ تکمیل شد</p>
              <p className="text-xs text-muted-foreground">
                تمام کلاس‌ها برنامه هفتگی دریافت کردند
              </p>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
