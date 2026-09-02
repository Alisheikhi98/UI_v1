import { useEffect, useRef, useState, type ComponentProps, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, Loader2, Lock, Ticket, User } from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/header";
import { withAppName } from "@/lib/branding";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useAuthenticatedUser,
  useChangeAuthenticatedUserPassword,
  useUpdateAuthenticatedUser,
} from "@/lib/auth-session";
import {
  getSettingsErrorMessage,
  getSettingsFieldErrors,
  validatePasswordChange,
  type SettingsFieldErrors,
} from "@/lib/settings-errors";
import { copyReferralCode, getReferralCode } from "@/lib/referral-code";

export const Route = createFileRoute("/dashboard/settings")({
  head: () => ({
    meta: [
      { title: withAppName("تنظیمات") },
      { name: "description", content: "مدیریت پروفایل و امنیت حساب کاربری" },
    ],
  }),
  component: SettingsPage,
});

type ProfileForm = {
  username: string;
  full_name: string;
  phone_number: string;
  email: string;
};

const emptyProfile: ProfileForm = {
  username: "",
  full_name: "",
  phone_number: "",
  email: "",
};

function SettingsPage() {
  const userQuery = useAuthenticatedUser();
  const updateProfile = useUpdateAuthenticatedUser();
  const changePassword = useChangeAuthenticatedUserPassword();
  const [profile, setProfile] = useState<ProfileForm>(emptyProfile);
  const [profileErrors, setProfileErrors] = useState<SettingsFieldErrors>({});
  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
  const [passwordErrors, setPasswordErrors] = useState<SettingsFieldErrors>({});

  useEffect(() => {
    if (!userQuery.data) return;
    setProfile({
      username: userQuery.data.username,
      full_name: userQuery.data.full_name,
      phone_number: userQuery.data.phone_number,
      email: userQuery.data.email ?? "",
    });
  }, [userQuery.data]);

  const resetProfile = () => {
    if (!userQuery.data || updateProfile.isPending) return;
    setProfile({
      username: userQuery.data.username,
      full_name: userQuery.data.full_name,
      phone_number: userQuery.data.phone_number,
      email: userQuery.data.email ?? "",
    });
    setProfileErrors({});
  };

  const submitProfile = async (event: FormEvent) => {
    event.preventDefault();
    if (updateProfile.isPending) return;
    setProfileErrors({});
    try {
      await updateProfile.mutateAsync({
        username: profile.username.trim(),
        full_name: profile.full_name.trim(),
        phone_number: profile.phone_number.trim(),
        email: profile.email.trim() || null,
      });
      toast.success("اطلاعات پروفایل با موفقیت ذخیره شد.");
    } catch (error) {
      setProfileErrors(getSettingsFieldErrors(error));
      toast.error(getSettingsErrorMessage(error));
    }
  };

  const submitPassword = async (event: FormEvent) => {
    event.preventDefault();
    if (changePassword.isPending) return;
    const validationErrors = validatePasswordChange(
      passwords.current,
      passwords.next,
      passwords.confirm,
    );
    if (Object.keys(validationErrors).length > 0) {
      setPasswordErrors(validationErrors);
      return;
    }

    setPasswordErrors({});
    try {
      await changePassword.mutateAsync({
        current_password: passwords.current,
        new_password: passwords.next,
      });
      setPasswords({ current: "", next: "", confirm: "" });
      toast.success("رمز عبور با موفقیت تغییر کرد.");
    } catch (error) {
      setPasswordErrors(getSettingsFieldErrors(error));
      toast.error(getSettingsErrorMessage(error));
    }
  };

  return (
    <div className="flex flex-col">
      <Header title="تنظیمات" description="مدیریت پروفایل و امنیت حساب کاربری" />
      <div className="p-4 sm:p-6">
        <Tabs defaultValue="profile" dir="rtl" className="space-y-6">
          <TabsList className="grid w-full max-w-sm grid-cols-2">
            <TabsTrigger value="profile" className="gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">پروفایل</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Lock className="h-4 w-4" />
              <span className="hidden sm:inline">امنیت</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>تنظیمات پروفایل</CardTitle>
                <CardDescription>اطلاعات حساب کاربری خود را مدیریت کنید.</CardDescription>
              </CardHeader>
              <CardContent>
                {userQuery.isPending ? (
                  <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    در حال دریافت اطلاعات پروفایل…
                  </div>
                ) : userQuery.isError ? (
                  <div className="flex min-h-48 flex-col items-center justify-center gap-3 text-center">
                    <p className="text-sm text-destructive">دریافت اطلاعات پروفایل انجام نشد.</p>
                    <Button variant="outline" onClick={() => userQuery.refetch()}>
                      تلاش مجدد
                    </Button>
                  </div>
                ) : !userQuery.data ? (
                  <p className="py-12 text-center text-sm text-muted-foreground">
                    اطلاعات کاربر در دسترس نیست.
                  </p>
                ) : (
                  <form className="space-y-5" onSubmit={submitProfile} noValidate>
                    <ProfileField
                      id="profileFullName"
                      label="نام و نام خانوادگی"
                      value={profile.full_name}
                      error={profileErrors.full_name}
                      disabled={updateProfile.isPending}
                      autoComplete="name"
                      onChange={(value) =>
                        setProfile((current) => ({ ...current, full_name: value }))
                      }
                    />
                    <ProfileField
                      id="profilePhone"
                      label="شماره تلفن"
                      value={profile.phone_number}
                      error={profileErrors.phone_number}
                      disabled={updateProfile.isPending}
                      inputMode="tel"
                      autoComplete="tel"
                      dir="ltr"
                      onChange={(value) =>
                        setProfile((current) => ({ ...current, phone_number: value }))
                      }
                    />
                    <ProfileField
                      id="profileUsername"
                      label="نام کاربری"
                      value={profile.username}
                      error={profileErrors.username}
                      disabled={updateProfile.isPending}
                      autoComplete="username"
                      onChange={(value) =>
                        setProfile((current) => ({ ...current, username: value }))
                      }
                    />
                    <ProfileField
                      id="profileEmail"
                      label="ایمیل"
                      value={profile.email}
                      error={profileErrors.email}
                      disabled={updateProfile.isPending}
                      type="email"
                      autoComplete="email"
                      dir="ltr"
                      onChange={(value) => setProfile((current) => ({ ...current, email: value }))}
                    />
                    <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={resetProfile}
                        disabled={updateProfile.isPending}
                      >
                        انصراف
                      </Button>
                      <Button type="submit" disabled={updateProfile.isPending}>
                        {updateProfile.isPending ? (
                          <Loader2 className="me-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="me-2 h-4 w-4" />
                        )}
                        ذخیره تغییرات
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
            {userQuery.data ? (
              <ReferralCodeCard referralCode={userQuery.data.referral_code} />
            ) : null}
          </TabsContent>

          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>تغییر رمز عبور</CardTitle>
                <CardDescription>برای حفظ امنیت حساب، یک رمز عبور قوی انتخاب کنید.</CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={submitPassword} noValidate>
                  <PasswordField
                    id="currentPassword"
                    label="رمز عبور فعلی"
                    value={passwords.current}
                    error={passwordErrors.current_password}
                    disabled={changePassword.isPending}
                    autoComplete="current-password"
                    onChange={(value) =>
                      setPasswords((current) => ({ ...current, current: value }))
                    }
                  />
                  <PasswordField
                    id="newPassword"
                    label="رمز عبور جدید"
                    value={passwords.next}
                    error={passwordErrors.new_password}
                    disabled={changePassword.isPending}
                    autoComplete="new-password"
                    onChange={(value) => setPasswords((current) => ({ ...current, next: value }))}
                  />
                  <PasswordField
                    id="confirmPassword"
                    label="تأیید رمز عبور جدید"
                    value={passwords.confirm}
                    error={passwordErrors.confirm_password}
                    disabled={changePassword.isPending}
                    autoComplete="new-password"
                    onChange={(value) =>
                      setPasswords((current) => ({ ...current, confirm: value }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    رمز عبور باید حداقل ۸ نویسه و شامل حرف بزرگ انگلیسی، حرف کوچک انگلیسی و عدد
                    باشد.
                  </p>
                  <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={changePassword.isPending}
                      onClick={() => {
                        setPasswords({ current: "", next: "", confirm: "" });
                        setPasswordErrors({});
                      }}
                    >
                      انصراف
                    </Button>
                    <Button type="submit" disabled={changePassword.isPending}>
                      {changePassword.isPending && (
                        <Loader2 className="me-2 h-4 w-4 animate-spin" />
                      )}
                      به‌روزرسانی رمز عبور
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

type ReferralCopyState = "idle" | "copied" | "failed";

function ReferralCodeCard({ referralCode }: { referralCode: string | null | undefined }) {
  const code = getReferralCode(referralCode);
  const [copyState, setCopyState] = useState<ReferralCopyState>("idle");
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(function clearReferralCopyTimerOnUnmount() {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, []);

  function setTemporaryCopyState(state: ReferralCopyState) {
    setCopyState(state);
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(() => setCopyState("idle"), 1800);
  }

  async function handleCopyReferralCode() {
    const copied = await copyReferralCode(code);
    setTemporaryCopyState(copied ? "copied" : "failed");
  }

  return (
    <Card data-testid="referral-code-card" className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Ticket className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <CardTitle className="text-base">کد معرف</CardTitle>
            <CardDescription className="mt-1">
              این کد را برای معرفی چیدمان به دیگران به اشتراک بگذارید.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {code ? (
          <div className="rounded-xl border border-border/70 bg-muted/30 p-3 sm:p-4">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <code
                dir="ltr"
                className="min-w-0 break-all text-center font-mono text-lg font-bold tracking-wider text-foreground sm:text-start"
              >
                {code}
              </code>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full shrink-0 gap-2 sm:w-auto"
                aria-label="کپی کد معرف"
                title="کپی کد معرف"
                onClick={() => void handleCopyReferralCode()}
              >
                {copyState === "copied" ? (
                  <Check className="h-4 w-4 text-primary" aria-hidden="true" />
                ) : (
                  <Copy className="h-4 w-4" aria-hidden="true" />
                )}
                کپی
              </Button>
            </div>
            <p
              role="status"
              aria-live="polite"
              className={`mt-2 min-h-5 text-xs ${
                copyState === "failed" ? "text-destructive" : "text-primary"
              }`}
            >
              {copyState === "copied"
                ? "کپی شد"
                : copyState === "failed"
                  ? "کپی کد معرف انجام نشد. دوباره تلاش کنید."
                  : ""}
            </p>
          </div>
        ) : (
          <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
            کد معرف برای این حساب ثبت نشده است.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function ProfileField({
  id,
  label,
  value,
  error,
  onChange,
  ...inputProps
}: {
  id: string;
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
} & Omit<ComponentProps<typeof Input>, "id" | "value" | "onChange">) {
  const errorId = `${id}-error`;
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        {...inputProps}
        id={id}
        value={value}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {error && (
        <p id={errorId} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

function PasswordField(props: ComponentProps<typeof ProfileField>) {
  return <ProfileField {...props} type="password" />;
}
