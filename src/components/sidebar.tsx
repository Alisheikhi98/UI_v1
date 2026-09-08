import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Sparkles,
  CalendarDays,
  Settings,
  CreditCard,
  MessageCircle,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { AuthenticatedUser } from "@/lib/api/auth";
import { APP_NAME } from "@/lib/branding";

const navigation = [
  { name: "داشبورد", href: "/dashboard", icon: LayoutDashboard },
  { name: "مدرسه", href: "/dashboard/schools", icon: LayoutDashboard },
  { name: "کلاس‌ها", href: "/dashboard/classes", icon: GraduationCap },
  { name: "معلمان", href: "/dashboard/teachers", icon: Users },
  { name: "تولید برنامه", href: "/dashboard/generator", icon: Sparkles },
  { name: "برنامه هفتگی", href: "/dashboard/timetable", icon: CalendarDays },
  { name: "طرح و اشتراک", href: "/dashboard/subscription", icon: CreditCard },
  { name: "تنظیمات", href: "/dashboard/settings", icon: Settings },
  { name: "ارتباط با ما", href: "/dashboard/contact", icon: MessageCircle },
];

export function Sidebar({
  user,
  onLogout,
  isLoggingOut,
}: {
  user: AuthenticatedUser;
  onLogout: () => Promise<void>;
  isLoggingOut: boolean;
}) {
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileMenuOpen]);

  return (
    <>
      {/* Mobile menu button */}
      <div id="mobile-dashboard-menu-trigger" className="fixed right-3 top-2.5 z-[80] lg:hidden">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="h-11 w-11 bg-card shadow-sm"
          aria-label={mobileMenuOpen ? "بستن منوی اصلی" : "باز کردن منوی اصلی"}
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-dashboard-navigation"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        id="mobile-dashboard-navigation"
        className={cn(
          "fixed right-0 top-0 z-[70] h-dvh w-[min(18rem,calc(100vw-1.5rem))] overflow-hidden border-l border-sidebar-border bg-sidebar transition-transform lg:z-40 lg:h-screen lg:w-64 lg:translate-x-0",
          mobileMenuOpen ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-5 pe-16 lg:px-6">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <CalendarDays className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold text-sidebar-foreground">{APP_NAME}</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
            {navigation.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                  )}
                >
                  <item.icon className={cn("h-5 w-5", isActive && "text-primary")} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="border-t border-sidebar-border p-4">
            <div className="flex items-center gap-3 rounded-lg px-3 py-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                <span className="text-sm font-medium">{user.full_name.slice(0, 2)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {user.full_name}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user.email ?? user.username}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void onLogout()}
              disabled={isLoggingOut}
              className="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:pointer-events-none disabled:opacity-50"
            >
              <LogOut className="h-4 w-4" />
              {isLoggingOut ? "در حال خروج…" : "خروج از سیستم"}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
