import { useState } from "react";
import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PublicOnlyAuth } from "@/components/auth/public-only-auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getLoginErrorMessage } from "@/lib/auth-errors";
import { loginAndBootstrap, validateStoredSession } from "@/lib/auth-session";

interface LoginSearch {
  redirect?: string;
}

function safeDashboardDestination(value: unknown): string | undefined {
  return typeof value === "string" && value.startsWith("/dashboard") ? value : undefined;
}

export const Route = createFileRoute("/auth/login")({
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    redirect: safeDashboardDestination(search.redirect),
  }),
  beforeLoad: async ({ context, search }) => {
    if (typeof window === "undefined") return;
    if (await validateStoredSession(context.queryClient)) {
      throw redirect({ to: (search.redirect ?? "/dashboard") as "/dashboard" });
    }
  },
  head: () => ({ meta: [{ title: "ورود - آموزش‌یار" }] }),
  component: LoginRoutePage,
});

function LoginRoutePage() {
  const search = Route.useSearch();

  return (
    <PublicOnlyAuth authenticatedDestination={search.redirect}>
      <LoginPage />
    </PublicOnlyAuth>
  );
}

function LoginPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const search = Route.useSearch();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; password?: string }>({});

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isLoading) return;

    const nextErrors: typeof fieldErrors = {};
    if (!username.trim()) nextErrors.username = "نام کاربری الزامی است.";
    if (!password.trim()) nextErrors.password = "رمز عبور الزامی است.";
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsLoading(true);
    try {
      await loginAndBootstrap(queryClient, username.trim(), password);
      toast.success("خوش آمدید!", { description: "هویت شما با موفقیت تأیید شد." });
      const destination = search.redirect ?? "/dashboard";
      await navigate({ to: destination as "/dashboard", replace: true });
    } catch (error) {
      toast.error("ورود ناموفق بود", { description: getLoginErrorMessage(error) });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-80 w-80 rounded-full bg-secondary/20 blur-3xl" />
      </div>

      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <CalendarDays className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold">خوش آمدید</CardTitle>
          <CardDescription>وارد حساب کاربری آموزش‌یار خود شوید</CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">نام کاربری</Label>
              <Input
                id="username"
                type="text"
                placeholder="ali123"
                value={username}
                onChange={(event) => {
                  setUsername(event.target.value);
                  setFieldErrors((errors) => ({ ...errors, username: undefined }));
                }}
                aria-invalid={Boolean(fieldErrors.username)}
                aria-describedby={fieldErrors.username ? "username-error" : undefined}
                disabled={isLoading}
                autoComplete="username"
              />
              {fieldErrors.username && (
                <p id="username-error" role="alert" className="text-xs text-destructive">
                  {fieldErrors.username}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">رمز عبور</Label>
                <Link
                  to="/auth/forgot-password"
                  aria-disabled={isLoading}
                  tabIndex={isLoading ? -1 : undefined}
                  onClick={(event) => isLoading && event.preventDefault()}
                  className="text-sm text-primary hover:underline aria-disabled:pointer-events-none aria-disabled:opacity-50"
                >
                  فراموشی رمز عبور؟
                </Link>
              </div>

              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="رمز عبور خود را وارد کنید"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setFieldErrors((errors) => ({ ...errors, password: undefined }));
                  }}
                  aria-invalid={Boolean(fieldErrors.password)}
                  aria-describedby={fieldErrors.password ? "password-error" : undefined}
                  disabled={isLoading}
                  autoComplete="current-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute left-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword((visible) => !visible)}
                  disabled={isLoading}
                  aria-label={showPassword ? "پنهان‌کردن رمز عبور" : "نمایش رمز عبور"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              {fieldErrors.password && (
                <p id="password-error" role="alert" className="text-xs text-destructive">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            <div className="flex items-center space-x-2 gap-2">
              <Checkbox id="remember" disabled={isLoading} />
              <Label htmlFor="remember" className="text-sm font-normal">
                مرا برای ۳۰ روز به خاطر بسپار
              </Label>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  در حال ورود...
                </>
              ) : (
                "ورود"
              )}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              حساب کاربری ندارید؟{" "}
              <Link
                to="/auth/register"
                aria-disabled={isLoading}
                tabIndex={isLoading ? -1 : undefined}
                onClick={(event) => isLoading && event.preventDefault()}
                className="text-primary hover:underline aria-disabled:pointer-events-none aria-disabled:opacity-50"
              >
                ثبت‌نام کنید
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
