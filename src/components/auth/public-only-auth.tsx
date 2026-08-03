import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useAuthenticatedUser } from "@/lib/auth-session";
import { useAccessToken } from "@/lib/auth-token";

export function PublicOnlyAuth({
  children,
  authenticatedDestination = "/dashboard",
}: {
  children: ReactNode;
  authenticatedDestination?: string;
}) {
  const token = useAccessToken();
  const userQuery = useAuthenticatedUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (userQuery.data) {
      void navigate({ to: authenticatedDestination as "/dashboard", replace: true });
    }
  }, [authenticatedDestination, navigate, userQuery.data]);

  if (token && (userQuery.isPending || userQuery.isSuccess)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          در حال بررسی نشست کاربری…
        </div>
      </div>
    );
  }

  return children;
}
