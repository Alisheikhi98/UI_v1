import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Building2,
  Calendar,
  Clock,
  Plus,
  Pencil,
  Fingerprint,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSchoolsRepository } from "@/lib/api/school-queries";
import {
  type School,
  type SchoolFormData,
  WEEK_DAYS,
  DEFAULT_WORKING_DAYS,
  calculatePeriods,
  PeriodTime,
} from "@/lib/api/schools-store";
import { cn } from "@/lib/utils";
import { setActiveSchoolId } from "@/lib/active-school";
import {
  getBreakDuration,
  getScheduleValidationError,
  shiftTimeByMinutes,
  updateBreakDuration,
} from "@/lib/school-schedule";

export const Route = createFileRoute("/dashboard/schools")({
  component: SchoolsPage,
});

interface FormState {
  name: string;
  slug: string;
  workingDays: string[];
  timing: {
    periodsCount: number;
    dayStart: string;
    classDuration: number;
    breakDuration: number;
  };
  periods: PeriodTime[];
}

const defaultForm = (): FormState => {
  const timing = { periodsCount: 4, dayStart: "08:00", classDuration: 75, breakDuration: 15 };
  return {
    name: "",
    slug: "",
    workingDays: [...DEFAULT_WORKING_DAYS],
    timing,
    periods: calculatePeriods(
      timing.periodsCount,
      timing.dayStart,
      timing.classDuration,
      timing.breakDuration,
    ),
  };
};

function SchoolsPage() {
  const { schools, query: schoolsQuery, create, update } = useSchoolsRepository();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<School | null>(null);

  const stats = useMemo(() => {
    const totalSchools = schools.length;
    const activeDaysSet = new Set<string>();
    schools.forEach((s) => {
      s.workingDays.forEach((d) => activeDaysSet.add(d));
    });
    return {
      totalSchools,
      activeDays: activeDaysSet.size,
    };
  }, [schools]);

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (s: School) => {
    setActiveSchoolId(s.id);
    setEditing(s);
    setDialogOpen(true);
  };

  return (
    <div className="flex flex-col" dir="rtl">
      <Header
        title="مدرسه"
        description="مشخصات مدرسه، روزهای کاری و برنامه زمانی زنگ‌ها را مدیریت کنید."
      />
      <main className="space-y-6 p-4 sm:p-6">
        <div className="flex justify-end">
          {!schoolsQuery.isPending && !schoolsQuery.isError && schools.length === 0 && (
            <Button onClick={openCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              افزودن مدرسه جدید
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard
            icon={Building2}
            label="مجموع مدارس"
            value={stats.totalSchools}
            tone="primary"
          />
          <StatCard
            icon={Calendar}
            label="روزهای کاری فعال"
            value={stats.activeDays}
            tone="success"
          />
        </div>

        {/* List / Empty */}
        {schoolsQuery.isPending ? (
          <div className="text-center text-muted-foreground py-12">در حال بارگذاری…</div>
        ) : schoolsQuery.isError ? (
          <div className="space-y-3 py-12 text-center">
            <p className="text-sm text-destructive">اطلاعات مدرسه دریافت نشد. دوباره تلاش کنید.</p>
            <Button variant="outline" size="sm" onClick={() => schoolsQuery.refetch()}>
              تلاش مجدد
            </Button>
          </div>
        ) : schools.length === 0 ? (
          <EmptyState onCreate={openCreate} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {schools.map((s) => (
              <SchoolCard key={s.id} school={s} onEdit={() => openEdit(s)} />
            ))}
          </div>
        )}

        <SchoolDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          editing={editing}
          dayOptions={editing?.dayOptions.map((day) => day.label) ?? WEEK_DAYS}
          onSubmit={async (data) => {
            try {
              if (editing) {
                await update({ id: editing.id, data });
                toast.success("مدرسه با موفقیت به‌روزرسانی شد");
              } else {
                await create(data);
                toast.success("مدرسه جدید با موفقیت اضافه شد");
              }
              setDialogOpen(false);
            } catch {
              toast.error(editing ? "خطا در ویرایش مدرسه" : "خطا در ایجاد مدرسه", {
                description: "ارتباط با سرور برقرار نشد. دوباره تلاش کنید.",
              });
            }
          }}
        />
      </main>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  tone: "primary" | "success";
}) {
  const tones = {
    primary: "bg-primary/10 text-primary",
    success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  };
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-6 flex items-center gap-4">
        <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center", tones[tone])}>
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold mt-0.5">{value.toLocaleString("fa-IR")}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <Card className="border-dashed">
      <CardContent className="py-16 flex flex-col items-center text-center gap-4">
        <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Building2 className="h-10 w-10 text-primary" />
        </div>
        <div className="space-y-1">
          <h3 className="text-xl font-semibold">هنوز مدرسه‌ای ثبت نکرده‌اید</h3>
          <p className="text-muted-foreground max-w-md">
            برای شروع کار، اولین مدرسه خود را ایجاد کنید. می‌توانید مشخصات، روزهای کاری و برنامه
            زنگ‌ها را برای هر مدرسه به‌صورت مستقل تنظیم کنید.
          </p>
        </div>
        <Button onClick={onCreate} className="gap-2 mt-2">
          <Plus className="h-4 w-4" />
          افزودن اولین مدرسه
        </Button>
      </CardContent>
    </Card>
  );
}

function SchoolCard({ school, onEdit }: { school: School; onEdit: () => void }) {
  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base">{school.name}</CardTitle>
              <CardDescription className="mt-0.5 flex items-center gap-1 text-xs">
                <Fingerprint className="h-3.5 w-3.5" aria-hidden="true" />
                شناسه: {school.slug}
              </CardDescription>
            </div>
          </div>
          <Badge variant={school.status === "active" ? "default" : "secondary"}>
            {school.status === "active" ? "فعال" : "غیرفعال"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <Separator />
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-md bg-muted/50 p-2">
            <p className="text-muted-foreground">روزهای کاری</p>
            <p className="font-medium mt-0.5">{school.workingDays.length} روز</p>
          </div>
          <div className="rounded-md bg-muted/50 p-2">
            <p className="text-muted-foreground">زنگ‌ها</p>
            <p className="font-medium mt-0.5">{school.timing.periodsCount} زنگ</p>
          </div>
        </div>
        <div className="flex pt-2">
          <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
            ویرایش
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SchoolDialog({
  open,
  onOpenChange,
  editing,
  dayOptions,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: School | null;
  dayOptions: readonly string[];
  onSubmit: (data: SchoolFormData) => Promise<void>;
}) {
  const [form, setForm] = useState<FormState>(defaultForm());
  const [submitting, setSubmitting] = useState(false);
  const [periodsDirty, setPeriodsDirty] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      const emptyScheduleDefaults = defaultForm();
      setForm(
        editing
          ? {
              name: editing.name,
              slug: editing.slug,
              workingDays: [...editing.workingDays],
              timing:
                editing.periods.length > 0 ? { ...editing.timing } : emptyScheduleDefaults.timing,
              periods:
                editing.periods.length > 0 ? [...editing.periods] : emptyScheduleDefaults.periods,
            }
          : emptyScheduleDefaults,
      );
      setPeriodsDirty(false);
      setScheduleError(null);
    }
  }, [open, editing]);

  // Auto-generate periods when timing changes (unless user manually edited)
  useEffect(() => {
    if (!periodsDirty) {
      setForm((f) => ({
        ...f,
        periods: calculatePeriods(
          f.timing.periodsCount,
          f.timing.dayStart,
          f.timing.classDuration,
          f.timing.breakDuration,
        ),
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    form.timing.periodsCount,
    form.timing.dayStart,
    form.timing.classDuration,
    form.timing.breakDuration,
  ]);

  const toggleDay = (day: string) => {
    setForm((f) => ({
      ...f,
      workingDays: f.workingDays.includes(day)
        ? f.workingDays.filter((d) => d !== day)
        : [...f.workingDays, day],
    }));
  };

  const regenerate = () => {
    setForm((f) => ({
      ...f,
      periods: calculatePeriods(
        f.timing.periodsCount,
        f.timing.dayStart,
        f.timing.classDuration,
        f.timing.breakDuration,
      ),
    }));
    setPeriodsDirty(false);
    setScheduleError(null);
    toast.success("جدول زنگ‌ها بازسازی شد");
  };

  const updatePeriods = (periods: PeriodTime[]) => {
    const error = getScheduleValidationError(periods);
    if (error) {
      setScheduleError(error);
      return;
    }
    setForm((current) => ({ ...current, periods }));
    setPeriodsDirty(true);
    setScheduleError(null);
  };

  const updateBreak = (breakIndex: number, duration: number) => {
    const result = updateBreakDuration(form.periods, breakIndex, duration);
    if (result.error) {
      setScheduleError(result.error);
      return;
    }
    setForm((current) => ({ ...current, periods: result.periods }));
    setPeriodsDirty(true);
    setScheduleError(null);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error("نام مدرسه الزامی است");
      return;
    }
    if (!form.slug.trim()) {
      toast.error("شناسه مدرسه الزامی است");
      return;
    }
    if (!/^[a-z0-9-]+$/.test(form.slug.trim())) {
      toast.error("شناسه مدرسه فقط می‌تواند شامل حروف کوچک انگلیسی، عدد و خط تیره باشد");
      return;
    }
    const periodsError = getScheduleValidationError(form.periods);
    if (periodsError) {
      setScheduleError(periodsError);
      toast.error(periodsError);
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        name: form.name.trim(),
        slug: form.slug.trim(),
        workingDays: form.workingDays,
        timing: form.timing,
        periods: form.periods,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !submitting && onOpenChange(nextOpen)}>
      <DialogContent dir="rtl" className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader className="w-full text-right sm:text-right">
          <DialogTitle className="flex items-center gap-2 text-right">
            <Building2 className="h-5 w-5 text-primary" />
            {editing ? "ویرایش مدرسه" : "ایجاد مدرسه جدید"}
          </DialogTitle>
          <DialogDescription dir="rtl" className="text-right leading-relaxed">
            مشخصات مدرسه، روزهای کاری و برنامه زمانی زنگ‌ها را تنظیم کنید.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Basic info */}
          <section className="space-y-4">
            <SectionTitle icon={Building2} title="اطلاعات پایه" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="نام مدرسه *" icon={Building2}>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="مثلاً: دبیرستان شهید بهشتی"
                />
              </Field>
              <Field label="شناسه مدرسه *" icon={Fingerprint}>
                <Input
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder="alborz-high-school"
                  dir="ltr"
                />
              </Field>
            </div>
          </section>

          <Separator />

          {/* Working days */}
          <section className="space-y-3">
            <SectionTitle icon={Calendar} title="روزهای کاری" />
            <p className="text-xs text-muted-foreground">
              روزهایی که مدرسه در آن‌ها فعال است را انتخاب کنید.
            </p>
            <div className="flex flex-wrap gap-2">
              {dayOptions.map((day) => {
                const active = form.workingDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={cn(
                      "px-4 py-2 rounded-full text-sm font-medium border transition-all",
                      active
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-background border-border hover:bg-muted",
                    )}
                  >
                    {active && <CheckCircle2 className="me-1 inline-block h-3.5 w-3.5" />}
                    {day}
                  </button>
                );
              })}
            </div>
          </section>

          <Separator />

          {/* Timing */}
          <section className="space-y-4">
            <SectionTitle icon={Clock} title="تنظیمات زمانی و زنگ‌ها" />
            <div
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(90px,0.7fr)_minmax(190px,1.25fr)_minmax(140px,1fr)_minmax(180px,1.15fr)] lg:gap-3"
              data-testid="school-timing-settings-grid"
            >
              <Field label="تعداد زنگ‌ها" className="min-w-0" labelClassName="min-h-10 items-end">
                <Input
                  type="number"
                  min={1}
                  max={7}
                  value={form.timing.periodsCount}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      timing: {
                        ...form.timing,
                        periodsCount: Math.min(7, Math.max(1, Number(e.target.value) || 1)),
                      },
                    })
                  }
                />
              </Field>
              <Field label="ساعت شروع روز" className="min-w-0" labelClassName="min-h-10 items-end">
                <div className="flex h-10 min-w-0 items-center overflow-hidden rounded-md border bg-background">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-10 w-9 shrink-0 rounded-none"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        timing: {
                          ...current.timing,
                          dayStart: shiftTimeByMinutes(current.timing.dayStart, 15),
                        },
                      }))
                    }
                    aria-label="۱۵ دقیقه دیرتر"
                    title="۱۵ دقیقه دیرتر"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Input
                    type="time"
                    step={900}
                    value={form.timing.dayStart}
                    onChange={(e) =>
                      setForm({ ...form, timing: { ...form.timing, dayStart: e.target.value } })
                    }
                    className="h-10 min-w-0 flex-1 rounded-none border-y-0 px-1 text-center shadow-none focus-visible:ring-0"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-10 w-9 shrink-0 rounded-none"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        timing: {
                          ...current.timing,
                          dayStart: shiftTimeByMinutes(current.timing.dayStart, -15),
                        },
                      }))
                    }
                    aria-label="۱۵ دقیقه زودتر"
                    title="۱۵ دقیقه زودتر"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </div>
              </Field>
              <Field
                label="مدت هر زنگ (دقیقه)"
                className="min-w-0"
                labelClassName="min-h-10 items-end"
              >
                <Input
                  type="number"
                  min={5}
                  value={form.timing.classDuration}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      timing: {
                        ...form.timing,
                        classDuration: Math.max(5, Number(e.target.value) || 5),
                      },
                    })
                  }
                />
              </Field>
              <Field
                label="مدت پیش‌فرض زنگ تفریح (دقیقه)"
                className="min-w-0"
                labelClassName="min-h-10 items-end"
              >
                <Input
                  type="number"
                  min={0}
                  value={form.timing.breakDuration}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      timing: {
                        ...form.timing,
                        breakDuration: Math.max(0, Number(e.target.value) || 0),
                      },
                    })
                  }
                />
              </Field>
            </div>

            <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h4 className="text-sm font-semibold">پیش‌نمایش زنده جدول زنگ‌ها</h4>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={regenerate}
                  className="gap-1 text-xs"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  بازسازی خودکار
                </Button>
              </div>
              <div className="space-y-2">
                {form.periods.map((p, idx) => (
                  <div key={p.index} className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="w-16 justify-center shrink-0">
                      زنگ {p.index.toLocaleString("fa-IR")}
                    </Badge>
                    <Input
                      type="time"
                      value={p.start}
                      onChange={(e) => {
                        const periods = form.periods.map((period, periodIndex) =>
                          periodIndex === idx ? { ...period, start: e.target.value } : period,
                        );
                        updatePeriods(periods);
                      }}
                      className="max-w-[120px]"
                    />
                    <span className="text-muted-foreground text-sm">تا</span>
                    <Input
                      type="time"
                      value={p.end}
                      onChange={(e) => {
                        const periods = form.periods.map((period, periodIndex) =>
                          periodIndex === idx ? { ...period, end: e.target.value } : period,
                        );
                        updatePeriods(periods);
                      }}
                      className="max-w-[120px]"
                    />
                    {idx < form.periods.length - 1 && (
                      <div className="ms-auto flex items-center gap-2 rounded-md bg-muted/60 px-2 py-1">
                        <Label htmlFor={`break-${idx}`} className="whitespace-nowrap text-xs">
                          استراحت {(idx + 1).toLocaleString("fa-IR")}
                        </Label>
                        <Input
                          id={`break-${idx}`}
                          data-testid={`break-duration-${idx + 1}`}
                          type="number"
                          min={0}
                          step={1}
                          value={getBreakDuration(form.periods, idx) ?? 0}
                          onChange={(event) => updateBreak(idx, Number(event.target.value))}
                          className="h-8 w-20 text-center"
                          aria-label={`مدت استراحت ${(idx + 1).toLocaleString("fa-IR")} به دقیقه`}
                        />
                        <span className="text-xs text-muted-foreground">دقیقه</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {scheduleError && (
                <p role="alert" className="text-xs text-destructive">
                  {scheduleError}
                </p>
              )}
              {periodsDirty && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  ⚠ زمان‌ها به‌صورت دستی ویرایش شده‌اند. برای بازگرداندن به مقادیر خودکار، دکمه
                  «بازسازی خودکار» را بزنید.
                </p>
              )}
            </div>
          </section>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            انصراف
          </Button>
          <Button onClick={handleSubmit} disabled={submitting} className="gap-2">
            {submitting ? "در حال ذخیره…" : editing ? "ذخیره تغییرات" : "ایجاد مدرسه"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SectionTitle({
  icon: Icon,
  title,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-primary" />
      <h3 className="text-sm font-semibold">{title}</h3>
    </div>
  );
}

function Field({
  label,
  icon: Icon,
  className,
  labelClassName,
  children,
}: {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
  labelClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className={cn("flex items-center gap-1.5 text-xs font-medium", labelClassName)}>
        {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
        {label}
      </Label>
      {children}
    </div>
  );
}
