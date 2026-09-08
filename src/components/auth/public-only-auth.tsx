import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useAuthSession } from "@/lib/auth-session";

export function PublicOnlyAuth({
  children,
  authenticatedDestination = "/dashboard",
}: {
  children: ReactNode;
  authenticatedDestination?: string;
}) {
  const session = useAuthSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (session.status === "authenticated") {
      void navigate({ to: authenticatedDestination as "/dashboard", replace: true });
    }
  }, [authenticatedDestination, navigate, session.status]);

  if (session.status !== "unauthenticated") {
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
