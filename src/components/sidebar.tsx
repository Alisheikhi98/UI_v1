import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Sparkles,
  CalendarDays,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { AuthenticatedUser } from "@/lib/api/auth";

const navigation = [
  { name: "داشبورد", href: "/dashboard", icon: LayoutDashboard },
  { name: "مدارس", href: "/dashboard/schools", icon: LayoutDashboard },
  { name: "معلمان", href: "/dashboard/teachers", icon: Users },
  { name: "کلاس‌ها", href: "/dashboard/classes", icon: GraduationCap },
  { name: "تولید برنامه", href: "/dashboard/generator", icon: Sparkles },
  { name: "برنامه هفتگی", href: "/dashboard/timetable", icon: CalendarDays },
  { name: "تنظیمات", href: "/dashboard/settings", icon: Settings },
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

  return (
    <>
      {/* Mobile menu button */}
      <div className="fixed top-4 right-4 z-50 lg:hidden">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="bg-card"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed right-0 top-0 z-40 h-screen w-64 border-l border-sidebar-border bg-sidebar transition-transform lg:translate-x-0",
          mobileMenuOpen ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-6">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <CalendarDays className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold text-sidebar-foreground">آموزش‌یار</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3 py-4">
            {navigation.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
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
