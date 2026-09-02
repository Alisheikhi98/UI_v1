import { useState } from "react";
import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Check, Eye, EyeOff, Loader2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getAuthFieldErrors,
  getRegistrationErrorMessage,
  type AuthFieldErrors,
} from "@/lib/auth-errors";
import { withAppName } from "@/lib/branding";
import { registerUser } from "@/lib/api/auth";
import { validateStoredSession } from "@/lib/auth-session";

export const Route = createFileRoute("/auth/register")({
  beforeLoad: async ({ context }) => {
    if (typeof window === "undefined") return;
    if (await validateStoredSession(context.queryClient)) {
      throw redirect({ to: "/dashboard" });
    }
  },
  head: () => ({ meta: [{ title: withAppName("ثبت‌نام") }] }),
  component: RegisterRoutePage,
});

function RegisterRoutePage() {
  return (
    <PublicOnlyAuth>
      <RegisterPage />
    </PublicOnlyAuth>
  );
}

const initialForm = {
  username: "",
  full_name: "",
  email: "",
  phone_number: "",
  password: "",
  referral_code: "",
};

function validateRegistration(form: typeof initialForm): AuthFieldErrors {
  const errors: AuthFieldErrors = {};
  if (form.username.trim().length < 3) errors.username = "نام کاربری باید حداقل ۳ کاراکتر باشد.";
  if (form.full_name.trim().length < 3)
    errors.full_name = "نام و نام خانوادگی باید حداقل ۳ کاراکتر باشد.";
  if (!/^09\d{9}$/.test(form.phone_number.replace(/[\s\-()]/g, "")))
    errors.phone_number = "شماره تلفن باید با قالب 09xxxxxxxxx وارد شود.";
  if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
    errors.email = "فرمت ایمیل معتبر نیست.";
  if (
    form.password.length < 8 ||
    !/[A-Z]/.test(form.password) ||
    !/[a-z]/.test(form.password) ||
    !/\d/.test(form.password)
  ) {
    errors.password = "رمز عبور باید حداقل ۸ کاراکتر و شامل حروف بزرگ، کوچک و عدد باشد.";
  }
  return errors;
}

function RegisterPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState(initialForm);
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const field = event.target.name as keyof typeof initialForm;
    setFormData((current) => ({ ...current, [field]: event.target.value }));
    setFieldErrors((errors) => ({ ...errors, [field]: undefined }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isLoading) return;

    const validationErrors = validateRegistration(formData);
    setFieldErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setIsLoading(true);
    try {
      await registerUser({
        username: formData.username.trim(),
        full_name: formData.full_name.trim(),
        phone_number: formData.phone_number.trim(),
        email: formData.email.trim() || null,
        password: formData.password,
        referral_code: formData.referral_code.trim() || undefined,
      });
      toast.success("ثبت‌نام با موفقیت انجام شد", {
        description: "اکنون با نام کاربری و رمز عبور ثبت‌شده وارد شوید.",
      });
      await queryClient.invalidateQueries({ queryKey: ["auth"] });
      await navigate({ to: "/auth/login", replace: true });
    } catch (error) {
      const apiFieldErrors = getAuthFieldErrors(error);
      if (Object.keys(apiFieldErrors).length > 0) setFieldErrors(apiFieldErrors);
      toast.error("ثبت‌نام ناموفق بود", {
        description: getRegistrationErrorMessage(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const passwordRequirements = [
    { text: "حداقل ۸ کاراکتر", met: formData.password.length >= 8 },
    { text: "شامل عدد باشد", met: /\d/.test(formData.password) },
    { text: "شامل حرف بزرگ باشد", met: /[A-Z]/.test(formData.password) },
    { text: "شامل حرف کوچک باشد", met: /[a-z]/.test(formData.password) },
  ];

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
          <CardTitle className="text-2xl font-bold">ایجاد حساب کاربری</CardTitle>
          <CardDescription>برای شروع، اطلاعات خود را وارد کنید</CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <RegistrationField
              id="username"
              label="نام کاربری"
              placeholder="ali123"
              value={formData.username}
              error={fieldErrors.username}
              onChange={handleChange}
              disabled={isLoading}
              autoComplete="username"
            />
            <RegistrationField
              id="full_name"
              label="نام و نام خانوادگی"
              placeholder="علی رضایی"
              value={formData.full_name}
              error={fieldErrors.full_name}
              onChange={handleChange}
              disabled={isLoading}
              autoComplete="name"
            />
            <RegistrationField
              id="phone_number"
              label="شماره تلفن"
              type="tel"
              placeholder="09123456789"
              value={formData.phone_number}
              error={fieldErrors.phone_number}
              onChange={handleChange}
              disabled={isLoading}
              autoComplete="tel"
            />
            <RegistrationField
              id="email"
              label="ایمیل (اختیاری)"
              type="email"
              placeholder="ali@example.com"
              value={formData.email}
              error={fieldErrors.email}
              onChange={handleChange}
              disabled={isLoading}
              autoComplete="email"
            />
            <RegistrationField
              id="referral_code"
              label="کد معرف"
              placeholder="در صورت داشتن کد معرف وارد کنید"
              helperText="اگر کد معرف دارید، می‌توانید اینجا وارد کنید."
              value={formData.referral_code}
              error={fieldErrors.referral_code}
              onChange={handleChange}
              disabled={isLoading}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
            />

            <div className="space-y-2">
              <Label htmlFor="password">رمز عبور</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="رمز عبور خود را وارد کنید"
                  value={formData.password}
                  onChange={handleChange}
                  aria-invalid={Boolean(fieldErrors.password)}
                  aria-describedby={fieldErrors.password ? "password-error" : undefined}
                  disabled={isLoading}
                  autoComplete="new-password"
                  className="pe-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute end-0 top-0 h-full px-3 hover:bg-transparent"
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

            <div className="space-y-2">
              {passwordRequirements.map((requirement) => (
                <div
                  key={requirement.text}
                  className={`flex items-center space-x-2 gap-2 text-sm ${
                    requirement.met ? "text-green-600" : "text-muted-foreground"
                  }`}
                >
                  <Check
                    className={`h-4 w-4 ${
                      requirement.met ? "text-green-600" : "text-muted-foreground"
                    }`}
                  />
                  <span>{requirement.text}</span>
                </div>
              ))}
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  در حال ثبت‌نام...
                </>
              ) : (
                "ثبت‌نام"
              )}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              قبلاً حساب ساخته‌اید؟{" "}
              <Link
                to="/auth/login"
                aria-disabled={isLoading}
                tabIndex={isLoading ? -1 : undefined}
                onClick={(event) => isLoading && event.preventDefault()}
                className="text-primary hover:underline aria-disabled:pointer-events-none aria-disabled:opacity-50"
              >
                ورود
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

function RegistrationField({
  id,
  label,
  error,
  helperText,
  ...inputProps
}: {
  id: "username" | "full_name" | "phone_number" | "email" | "referral_code";
  label: string;
  error?: string;
  helperText?: string;
} & Omit<React.ComponentProps<typeof Input>, "id" | "name">) {
  const errorId = `${id}-error`;
  const helperId = `${id}-helper`;
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        {...inputProps}
        id={id}
        name={id}
        aria-invalid={Boolean(error)}
        aria-describedby={
          [helperText ? helperId : null, error ? errorId : null].filter(Boolean).join(" ") ||
          undefined
        }
      />
      {helperText && (
        <p id={helperId} className="text-xs text-muted-foreground">
          {helperText}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
