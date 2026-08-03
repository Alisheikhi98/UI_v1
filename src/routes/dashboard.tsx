import { useEffect, useState } from "react";
import {
  createFileRoute,
  Outlet,
  redirect,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/sidebar";
import { useSchoolsRepository } from "@/lib/api/school-queries";
import { ApiError } from "@/lib/api/client";
import { buildLoginUrl, clearAuthenticatedSession, useAuthenticatedUser } from "@/lib/auth-session";
import { getAccessToken, useAccessToken } from "@/lib/auth-token";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: ({ location }) => {
    if (typeof window !== "undefined" && !getAccessToken()) {
      const requestedUrl = new URL(location.href, window.location.origin);
      throw redirect({
        href: buildLoginUrl(`${requestedUrl.pathname}${requestedUrl.search}`),
      });
    }
  },
  component: DashboardAuthBoundary,
});

function DashboardAuthBoundary() {
  const token = useAccessToken();
  const userQuery = useAuthenticatedUser();
  const navigate = useNavigate();
  const location = useRouterState({ select: (state) => state.location });
  const queryClient = useQueryClient();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    if (!token) {
      const requestedUrl = new URL(location.href, window.location.origin);
      window.location.replace(buildLoginUrl(`${requestedUrl.pathname}${requestedUrl.search}`));
    }
  }, [location.href, navigate, token]);

  if (!token || userQuery.isPending) return <SessionLoading />;

  if (userQuery.isError) {
    if (userQuery.error instanceof ApiError && userQuery.error.status === 401) {
      return <SessionLoading />;
    }
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="max-w-md space-y-4 text-center">
          <p className="font-medium">تأیید نشست کاربری انجام نشد.</p>
          <p className="text-sm text-muted-foreground">{userQuery.error.message}</p>
          <Button variant="outline" onClick={() => userQuery.refetch()}>
            تلاش مجدد
          </Button>
        </div>
      </div>
    );
  }

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    clearAuthenticatedSession(queryClient);
    await navigate({ to: "/auth/login", replace: true });
  };

  return (
    <AuthenticatedDashboard
      user={userQuery.data}
      onLogout={handleLogout}
      isLoggingOut={isLoggingOut}
    />
  );
}

function AuthenticatedDashboard({
  user,
  onLogout,
  isLoggingOut,
}: {
  user: NonNullable<ReturnType<typeof useAuthenticatedUser>["data"]>;
  onLogout: () => Promise<void>;
  isLoggingOut: boolean;
}) {
  useSchoolsRepository();
  return (
    <div className="min-h-screen bg-background">
      <Sidebar user={user} onLogout={onLogout} isLoggingOut={isLoggingOut} />
      <main className="lg:pr-64">
        <Outlet />
      </main>
    </div>
  );
}

function SessionLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        در حال بررسی نشست کاربری…
      </div>
    </div>
  );
}
