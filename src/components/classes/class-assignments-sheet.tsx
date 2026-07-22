import { useEffect, useState } from "react";
import {
  BookOpen,
  Check,
  ChevronsUpDown,
  CircleAlert,
  CircleCheck,
  GraduationCap,
  Minus,
  Plus,
  Search,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  MAX_WEEKLY_PERIODS,
  isAssignmentComplete,
  type ClassAssignment,
  type CourseOption,
  type TeacherOption,
  type Weekday,
} from "@/lib/class-configuration";

export interface AssignmentClass {
  id: string;
  name: string;
  grade: string;
  major: string;
  gradeId?: string;
  majorId?: string;
}

const WEEKDAY_OPTIONS: Array<{ value: Weekday; label: string }> = [
  { value: "saturday", label: "شنبه" },
  { value: "sunday", label: "یکشنبه" },
  { value: "monday", label: "دوشنبه" },
  { value: "tuesday", label: "سه‌شنبه" },
  { value: "wednesday", label: "چهارشنبه" },
  { value: "thursday", label: "پنج‌شنبه" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classItem: AssignmentClass | null;
  assignments: ClassAssignment[];
  courses: CourseOption[];
  teachers: TeacherOption[];
  onSaveAssignment: (assignment: ClassAssignment) => void;
  onDeleteAssignment: (id: string) => void;
  onCreateCourse: (course: CourseOption) => void;
  onCreateTeacher: (teacher: TeacherOption) => void;
  onUpdateTeacherAvailability: (teacherId: string, availableDays: Weekday[]) => void;
}

const serializeDraft = (items: ClassAssignment[]) =>
  JSON.stringify(
    [...items]
      .sort((first, second) => first.id.localeCompare(second.id))
      .map(({ id, classId, courseId, teacherId, slotsPerWeek }) => ({
        id,
        classId,
        courseId,
        teacherId,
        slotsPerWeek,
      })),
  );

export function ClassAssignmentsSheet({
  open,
  onOpenChange,
  classItem,
  assignments,
  courses,
  teachers,
  onSaveAssignment,
  onDeleteAssignment,
  onCreateCourse,
  onCreateTeacher,
  onUpdateTeacherAvailability,
}: Props) {
  const [draft, setDraft] = useState<ClassAssignment[]>([]);
  const [initialDraft, setInitialDraft] = useState<ClassAssignment[]>([]);
  const [search, setSearch] = useState("");
  const [courseToAdd, setCourseToAdd] = useState("");
  const [courseDialogOpen, setCourseDialogOpen] = useState(false);
  const [teacherDialogOpen, setTeacherDialogOpen] = useState(false);
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
  const [availabilityTeacherId, setAvailabilityTeacherId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !classItem) return;
    const current = assignments.filter((assignment) => assignment.classId === classItem.id);
    setDraft(current);
    setInitialDraft(current);
    setSearch("");
    setCourseToAdd("");
  }, [assignments, classItem, open]);

  const isDirty = serializeDraft(draft) !== serializeDraft(initialDraft);
  const assignedCourseIds = new Set(draft.map((assignment) => assignment.courseId));
  const activeTeachers = teachers.filter((teacher) => teacher.active);
  const compatibleCourses = courses.filter(
    (course) =>
      course.active &&
      course.grade === classItem?.grade &&
      (course.category === "general" || course.major === classItem?.major),
  );
  const availableCourses = compatibleCourses.filter((course) => !assignedCourseIds.has(course.id));
  const visibleDraft = draft.filter((assignment) => {
    const course = courses.find((item) => item.id === assignment.courseId);
    return course?.name.toLowerCase().includes(search.trim().toLowerCase());
  });
  const configuredCount = draft.filter((assignment) =>
    isAssignmentComplete(assignment, teachers),
  ).length;
  const missingTeacherCount = draft.filter((assignment) => !assignment.teacherId).length;
  const missingAvailabilityCount = draft.filter((assignment) => {
    const teacher = teachers.find((item) => item.id === assignment.teacherId);
    return Boolean(teacher && teacher.availableDays.length === 0);
  }).length;
  const totalWeeklyPeriods = draft.reduce(
    (total, assignment) => total + assignment.slotsPerWeek,
    0,
  );
  const completionPercent = draft.length ? Math.round((configuredCount / draft.length) * 100) : 0;
  const attentionCourses = visibleDraft.filter(
    (assignment) => !isAssignmentComplete(assignment, teachers),
  );
  const configuredCourses = visibleDraft.filter((assignment) =>
    isAssignmentComplete(assignment, teachers),
  );
  const hasIncompleteRows = configuredCount !== draft.length;

  if (!classItem) return null;

  const courseName = (id: string) =>
    courses.find((course) => course.id === id)?.name ?? "درس نامشخص";

  const requestClose = () => {
    if (isDirty) {
      setConfirmCloseOpen(true);
      return;
    }
    onOpenChange(false);
  };

  const addCourse = (courseId: string) => {
    if (!courseId || assignedCourseIds.has(courseId)) return;
    setDraft((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        classId: classItem.id,
        courseId,
        teacherId: "",
        slotsPerWeek: 1,
      },
    ]);
    setCourseToAdd("");
  };

  const updateTeacher = (assignmentId: string, teacherId: string) => {
    setDraft((current) =>
      current.map((assignment) =>
        assignment.id === assignmentId ? { ...assignment, teacherId } : assignment,
      ),
    );
  };

  const saveChanges = () => {
    if (hasIncompleteRows) {
      toast.error("برای ذخیره، اطلاعات همه درس‌ها را کامل کنید");
      return;
    }
    const draftIds = new Set(draft.map((assignment) => assignment.id));
    initialDraft.forEach((assignment) => {
      if (!draftIds.has(assignment.id)) onDeleteAssignment(assignment.id);
    });
    draft.forEach(onSaveAssignment);
    setInitialDraft(draft);
    toast.success("انتخاب معلمان ذخیره شد");
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : requestClose())}>
        <DialogContent
          dir="rtl"
          className="flex max-h-[94vh] w-[calc(100%-1rem)] max-w-[1120px] flex-col gap-0 overflow-hidden p-0 sm:w-[calc(100%-2rem)] sm:max-w-[1120px]"
        >
          <DialogHeader className="shrink-0 bg-muted/30 px-5 py-5 pe-12 text-right sm:px-7 sm:py-6">
            <div className="flex items-center gap-3">
              <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary sm:flex">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="truncate text-lg">
                  تنظیم دروس و معلمان - {classItem.name}
                </DialogTitle>
                <div className="mt-1 text-sm text-muted-foreground">
                  پایه {classItem.grade} • رشته {classItem.major}
                </div>
              </div>
            </div>
            <DialogDescription>
              برای هر درس، معلم و تعداد زنگ هفتگی را مشخص کنید. روزهای حضور هر معلم در تمام کلاس‌ها
              مشترک است و برای تولید برنامه هفتگی استفاده می‌شود.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="grid min-h-full lg:grid-cols-[230px_minmax(0,1fr)]">
              <aside className="border-b bg-muted/15 p-4 sm:p-5 lg:border-b-0 lg:border-l">
                <div className="grid grid-cols-2 gap-2 lg:grid-cols-1 lg:gap-3">
                  <div className="rounded-xl bg-background p-3 shadow-sm ring-1 ring-border/60">
                    <p className="text-xs text-muted-foreground">همه درس‌ها</p>
                    <p className="mt-1 text-xl font-bold">{draft.length.toLocaleString("fa-IR")}</p>
                  </div>
                  <div className="rounded-xl bg-background p-3 shadow-sm ring-1 ring-border/60">
                    <p className="text-xs text-muted-foreground">کاملاً تنظیم‌شده</p>
                    <p className="mt-1 text-xl font-bold text-primary">
                      {configuredCount.toLocaleString("fa-IR")}
                    </p>
                  </div>
                  <div className="rounded-xl bg-background p-3 shadow-sm ring-1 ring-border/60">
                    <p className="text-xs text-muted-foreground">بدون معلم</p>
                    <p className="mt-1 text-xl font-bold text-destructive">
                      {missingTeacherCount.toLocaleString("fa-IR")}
                    </p>
                  </div>
                  <div className="rounded-xl bg-background p-3 shadow-sm ring-1 ring-border/60">
                    <p className="text-xs text-muted-foreground">بدون روز حضور</p>
                    <p className="mt-1 text-xl font-bold text-amber-600 dark:text-amber-400">
                      {missingAvailabilityCount.toLocaleString("fa-IR")}
                    </p>
                  </div>
                  <div className="col-span-2 rounded-xl bg-background p-3 shadow-sm ring-1 ring-border/60 lg:col-span-1">
                    <p className="text-xs text-muted-foreground">مجموع زنگ هفتگی</p>
                    <p className="mt-1 text-xl font-bold">
                      {totalWeeklyPeriods.toLocaleString("fa-IR")}
                    </p>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">پیشرفت تکمیل</span>
                    <span className="font-medium">
                      ٪{completionPercent.toLocaleString("fa-IR")}
                    </span>
                  </div>
                  <Progress value={completionPercent} className="h-2" />
                </div>
                <div className="mt-5 hidden space-y-2 lg:block">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => setTeacherDialogOpen(true)}
                  >
                    <UserPlus className="me-2 h-4 w-4" /> معلم جدید
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => setCourseDialogOpen(true)}
                  >
                    <Plus className="me-2 h-4 w-4" /> درس جدید
                  </Button>
                </div>
              </aside>

              <main className="min-w-0 space-y-5 p-4 sm:p-6">
                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(250px,310px)]">
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="جستجو در درس‌های کلاس..."
                      className="bg-background pr-9"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Select value={courseToAdd} onValueChange={setCourseToAdd}>
                      <SelectTrigger className="min-w-0 flex-1 bg-background">
                        <SelectValue placeholder="افزودن درس موجود" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableCourses.map((course) => (
                          <SelectItem key={course.id} value={course.id}>
                            {course.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      disabled={!courseToAdd}
                      aria-label="افزودن درس موجود"
                      onClick={() => addCourse(courseToAdd)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {draft.length === 0 ? (
                  <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl bg-muted/25 p-6 text-center">
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                      <BookOpen className="h-6 w-6 text-primary" />
                    </div>
                    <p className="font-medium">هنوز درسی برای این کلاس ثبت نشده است.</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      یک درس موجود را اضافه کنید یا درس جدید بسازید.
                    </p>
                    <Button
                      className="mt-4"
                      variant="secondary"
                      onClick={() => setCourseDialogOpen(true)}
                    >
                      <Plus className="me-2 h-4 w-4" /> درس جدید
                    </Button>
                  </div>
                ) : visibleDraft.length === 0 ? (
                  <div className="rounded-2xl bg-muted/25 p-10 text-center text-sm text-muted-foreground">
                    درسی با این عبارت پیدا نشد.
                  </div>
                ) : (
                  <div className="space-y-7">
                    {attentionCourses.length > 0 && (
                      <CourseGroup
                        title="نیازمند تکمیل"
                        description="این درس‌ها برای تولید برنامه آماده نیستند."
                        icon={<CircleAlert className="h-4 w-4 text-destructive" />}
                        assignments={attentionCourses}
                        courses={courses}
                        teachers={activeTeachers}
                        onTeacherChange={updateTeacher}
                        onWeeklyPeriodsChange={(id, value) =>
                          setDraft((current) =>
                            current.map((item) =>
                              item.id === id
                                ? {
                                    ...item,
                                    slotsPerWeek: Math.min(MAX_WEEKLY_PERIODS, Math.max(1, value)),
                                  }
                                : item,
                            ),
                          )
                        }
                        onRemove={(id) =>
                          setDraft((current) => current.filter((item) => item.id !== id))
                        }
                        onEditAvailability={setAvailabilityTeacherId}
                      />
                    )}
                    {configuredCourses.length > 0 && (
                      <CourseGroup
                        title="آماده برای برنامه‌ریزی"
                        description="اطلاعات این درس‌ها کامل است."
                        icon={<CircleCheck className="h-4 w-4 text-primary" />}
                        assignments={configuredCourses}
                        courses={courses}
                        teachers={activeTeachers}
                        onTeacherChange={updateTeacher}
                        onWeeklyPeriodsChange={(id, value) =>
                          setDraft((current) =>
                            current.map((item) =>
                              item.id === id
                                ? {
                                    ...item,
                                    slotsPerWeek: Math.min(MAX_WEEKLY_PERIODS, Math.max(1, value)),
                                  }
                                : item,
                            ),
                          )
                        }
                        onRemove={(id) =>
                          setDraft((current) => current.filter((item) => item.id !== id))
                        }
                        onEditAvailability={setAvailabilityTeacherId}
                      />
                    )}
                  </div>
                )}
              </main>
            </div>
          </div>

          <DialogFooter className="shrink-0 flex-col-reverse gap-2 border-t bg-background px-4 py-3 sm:flex-row sm:px-6">
            <Button type="button" variant="ghost" onClick={requestClose}>
              بستن
            </Button>
            <div className="flex gap-2 lg:hidden">
              <Button type="button" variant="outline" onClick={() => setCourseDialogOpen(true)}>
                <Plus className="me-2 h-4 w-4" /> درس جدید
              </Button>
              <Button type="button" variant="outline" onClick={() => setTeacherDialogOpen(true)}>
                <UserPlus className="me-2 h-4 w-4" /> معلم جدید
              </Button>
            </div>
            <div className="hidden flex-1 items-center text-xs text-muted-foreground sm:flex">
              {hasIncompleteRows
                ? `${(draft.length - configuredCount).toLocaleString("fa-IR")} درس باید تکمیل شود.`
                : isDirty
                  ? "تغییرات شما هنوز ذخیره نشده است."
                  : "همه تنظیمات کامل و ذخیره شده‌اند."}
            </div>
            <Button
              type="button"
              className="min-w-40"
              disabled={!isDirty || hasIncompleteRows}
              onClick={saveChanges}
            >
              <Check className="me-2 h-4 w-4" /> ذخیره تنظیمات کلاس
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <QuickCreateCourseDialog
        open={courseDialogOpen}
        onOpenChange={setCourseDialogOpen}
        classItem={classItem}
        onCreate={(course) => {
          onCreateCourse(course);
          addCourse(course.id);
        }}
      />
      <QuickCreateTeacherDialog
        open={teacherDialogOpen}
        onOpenChange={setTeacherDialogOpen}
        onCreate={(teacher) => {
          onCreateTeacher(teacher);
          const firstMissing = draft.find((assignment) => !assignment.teacherId);
          if (firstMissing) updateTeacher(firstMissing.id, teacher.id);
        }}
      />

      <TeacherAvailabilityDialog
        open={Boolean(availabilityTeacherId)}
        onOpenChange={(next) => !next && setAvailabilityTeacherId(null)}
        teacher={teachers.find((teacher) => teacher.id === availabilityTeacherId) ?? null}
        onSave={(teacherId, availableDays) => {
          onUpdateTeacherAvailability(teacherId, availableDays);
          setAvailabilityTeacherId(null);
        }}
      />

      <AlertDialog open={confirmCloseOpen} onOpenChange={setConfirmCloseOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader className="text-right">
            <AlertDialogTitle>تغییرات ذخیره نشده</AlertDialogTitle>
            <AlertDialogDescription>
              تغییرات انتخاب معلمان ذخیره نشده است. آیا بدون ذخیره خارج می‌شوید؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ادامه ویرایش</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmCloseOpen(false);
                onOpenChange(false);
              }}
            >
              خروج بدون ذخیره
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function CourseGroup({
  title,
  description,
  icon,
  assignments,
  courses,
  teachers,
  onTeacherChange,
  onWeeklyPeriodsChange,
  onRemove,
  onEditAvailability,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  assignments: ClassAssignment[];
  courses: CourseOption[];
  teachers: TeacherOption[];
  onTeacherChange: (assignmentId: string, teacherId: string) => void;
  onWeeklyPeriodsChange: (assignmentId: string, value: number) => void;
  onRemove: (assignmentId: string) => void;
  onEditAvailability: (teacherId: string) => void;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-start gap-2">
        <div className="mt-0.5">{icon}</div>
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        {assignments.map((assignment) => (
          <CourseTeacherCard
            key={assignment.id}
            assignment={assignment}
            courseName={
              courses.find((course) => course.id === assignment.courseId)?.name ?? "درس نامشخص"
            }
            teachers={teachers}
            onTeacherChange={(teacherId) => onTeacherChange(assignment.id, teacherId)}
            onWeeklyPeriodsChange={(value) => onWeeklyPeriodsChange(assignment.id, value)}
            onRemove={() => onRemove(assignment.id)}
            onEditAvailability={onEditAvailability}
          />
        ))}
      </div>
    </section>
  );
}

function CourseTeacherCard({
  assignment,
  courseName,
  teachers,
  onTeacherChange,
  onWeeklyPeriodsChange,
  onRemove,
  onEditAvailability,
}: {
  assignment: ClassAssignment;
  courseName: string;
  teachers: TeacherOption[];
  onTeacherChange: (teacherId: string) => void;
  onWeeklyPeriodsChange: (value: number) => void;
  onRemove: () => void;
  onEditAvailability: (teacherId: string) => void;
}) {
  const selectedTeacher = teachers.find((teacher) => teacher.id === assignment.teacherId);
  const isComplete = Boolean(
    selectedTeacher?.availableDays.length &&
    assignment.slotsPerWeek >= 1 &&
    assignment.slotsPerWeek <= MAX_WEEKLY_PERIODS,
  );
  return (
    <Card
      className={cn(
        "flex h-full flex-col gap-4 border-0 p-4 shadow-sm ring-1",
        isComplete ? "ring-border/60" : "ring-destructive/25",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <h3 className="truncate text-base font-semibold leading-6">{courseName}</h3>
          <ConfigurationStatusBadge complete={isComplete} hasTeacher={Boolean(selectedTeacher)} />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
          aria-label={`حذف درس ${courseName} از کلاس`}
          onClick={onRemove}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {selectedTeacher && (
        <div className="rounded-lg bg-muted/40 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-xs font-medium">روزهای حضور معلم</span>
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs"
              onClick={() => onEditAvailability(selectedTeacher.id)}
            >
              ویرایش روزها
            </Button>
          </div>
          <AvailabilityBadges availableDays={selectedTeacher.availableDays} />
        </div>
      )}

      <div className="space-y-2">
        <Label>معلم درس</Label>
        <SearchablePicker
          value={assignment.teacherId}
          placeholder="انتخاب معلم"
          searchPlaceholder="جستجو با نام یا کد..."
          emptyText="معلم فعالی یافت نشد."
          options={teachers.map((teacher) => ({
            id: teacher.id,
            label: teacher.name,
            detail: teacher.code,
            search: `${teacher.name} ${teacher.code}`,
          }))}
          onChange={onTeacherChange}
          clearLabel="پاک‌کردن انتخاب"
        />
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 border-t pt-3">
        <div>
          <p className="text-sm font-medium">زنگ هفتگی</p>
          <p className="text-xs text-muted-foreground">از ۱ تا ۸ زنگ</p>
        </div>
        <div className="flex items-center rounded-lg border bg-background p-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={assignment.slotsPerWeek <= 1}
            aria-label="کاهش تعداد زنگ"
            onClick={() => onWeeklyPeriodsChange(assignment.slotsPerWeek - 1)}
          >
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <span className="min-w-9 text-center text-sm font-semibold tabular-nums">
            {assignment.slotsPerWeek.toLocaleString("fa-IR")}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={assignment.slotsPerWeek >= 8}
            aria-label="افزایش تعداد زنگ"
            onClick={() => onWeeklyPeriodsChange(assignment.slotsPerWeek + 1)}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

function ConfigurationStatusBadge({
  complete,
  hasTeacher,
}: {
  complete: boolean;
  hasTeacher: boolean;
}) {
  if (complete)
    return (
      <Badge>
        <Check className="me-1 h-3 w-3" /> کامل
      </Badge>
    );
  return (
    <Badge variant="destructive">
      <CircleAlert className="me-1 h-3 w-3" />
      {hasTeacher ? "روز حضور نامشخص" : "بدون معلم"}
    </Badge>
  );
}

function AvailabilityBadges({ availableDays }: { availableDays: Weekday[] }) {
  if (!availableDays.length)
    return <p className="text-xs font-medium text-destructive">روزهای حضور مشخص نشده</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {WEEKDAY_OPTIONS.filter((day) => availableDays.includes(day.value)).map((day) => (
        <Badge key={day.value} variant="secondary" className="font-normal">
          {day.label}
        </Badge>
      ))}
    </div>
  );
}

function SearchablePicker({
  value,
  options,
  placeholder,
  searchPlaceholder,
  emptyText,
  clearLabel,
  onChange,
}: {
  value: string;
  options: Array<{ id: string; label: string; detail?: string; search: string }>;
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
  clearLabel?: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.id === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className={cn("truncate", !selected && "text-muted-foreground")}>
            {selected?.label ?? placeholder}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] p-0"
        dir="rtl"
      >
        <Command
          filter={(itemValue, query) =>
            itemValue.toLowerCase().includes(query.toLowerCase()) ? 1 : 0
          }
        >
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {value && clearLabel && (
                <CommandItem
                  value="clear-current-selection"
                  onSelect={() => {
                    onChange("");
                    setOpen(false);
                  }}
                >
                  <X className="h-4 w-4" />
                  <span>{clearLabel}</span>
                </CommandItem>
              )}
              {options.map((option) => (
                <CommandItem
                  key={option.id}
                  value={option.search}
                  onSelect={() => {
                    onChange(option.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn("h-4 w-4", value === option.id ? "opacity-100" : "opacity-0")}
                  />
                  <span className="flex-1">{option.label}</span>
                  {option.detail && (
                    <span className="text-xs text-muted-foreground">{option.detail}</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function TeacherAvailabilityDialog({
  open,
  onOpenChange,
  teacher,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacher: TeacherOption | null;
  onSave: (teacherId: string, availableDays: Weekday[]) => void;
}) {
  const [selectedDays, setSelectedDays] = useState<Weekday[]>([]);

  useEffect(() => {
    if (open) setSelectedDays(teacher?.availableDays ?? []);
  }, [open, teacher]);

  if (!teacher) return null;

  const toggleDay = (day: Weekday) => {
    setSelectedDays((current) =>
      current.includes(day) ? current.filter((item) => item !== day) : [...current, day],
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="sm:max-w-md">
        <DialogHeader className="text-right">
          <DialogTitle>روزهای حضور {teacher.name}</DialogTitle>
          <DialogDescription>
            این روزها برای معلم ذخیره می‌شوند و در تمام کلاس‌های او اعمال خواهند شد.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2 py-3 sm:grid-cols-3">
          {WEEKDAY_OPTIONS.map((day) => {
            const selected = selectedDays.includes(day.value);
            return (
              <Button
                key={day.value}
                type="button"
                variant={selected ? "default" : "outline"}
                aria-pressed={selected}
                onClick={() => toggleDay(day.value)}
              >
                {selected && <Check className="me-2 h-4 w-4" />}
                {day.label}
              </Button>
            );
          })}
        </div>
        {!selectedDays.length && (
          <p className="text-sm text-destructive">حداقل یک روز حضور انتخاب کنید.</p>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            انصراف
          </Button>
          <Button
            type="button"
            disabled={!selectedDays.length}
            onClick={() => {
              onSave(teacher.id, selectedDays);
              toast.success("روزهای حضور معلم ذخیره شد");
            }}
          >
            ذخیره روزهای حضور
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function QuickCreateCourseDialog({
  open,
  onOpenChange,
  classItem,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classItem: AssignmentClass;
  onCreate: (course: CourseOption) => void;
}) {
  const [form, setForm] = useState({ name: "", category: "", active: true });
  useEffect(() => {
    if (open) setForm({ name: "", category: "", active: true });
  }, [classItem.grade, classItem.major, open]);
  const valid = Boolean(form.name.trim() && form.category);
  const gradeName =
    ({ "10": "دهم", "11": "یازدهم", "12": "دوازدهم" } as Record<string, string>)[classItem.grade] ??
    classItem.grade;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="sm:max-w-lg">
        <DialogHeader className="text-right">
          <DialogTitle>ایجاد درس جدید</DialogTitle>
          <DialogDescription>این درس پس از ذخیره به کلاس اضافه می‌شود.</DialogDescription>
        </DialogHeader>
        <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          این درس برای پایه {gradeName} و رشته {classItem.major} ایجاد می‌شود.
        </div>
        <div className="grid gap-4 py-2 sm:grid-cols-2">
          <Field label="نام درس">
            <Input
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
          </Field>
          <Field label="دسته‌بندی">
            <Select
              value={form.category}
              onValueChange={(category) => setForm({ ...form, category })}
            >
              <SelectTrigger>
                <SelectValue placeholder="انتخاب دسته‌بندی" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">عمومی</SelectItem>
                <SelectItem value="specialized">تخصصی</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <div className="flex items-center justify-between rounded-lg border px-3 py-2">
            <div>
              <Label>وضعیت فعال</Label>
              <p className="text-xs text-muted-foreground">قابل استفاده در کلاس‌ها</p>
            </div>
            <Switch
              checked={form.active}
              onCheckedChange={(active) => setForm({ ...form, active })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            انصراف
          </Button>
          <Button
            disabled={!valid}
            onClick={() => {
              const course: CourseOption = {
                ...form,
                name: form.name.trim(),
                code: "",
                id: crypto.randomUUID(),
                grade: classItem.grade,
                major: classItem.major,
                gradeId: classItem.gradeId ?? classItem.grade,
                gradeName,
                majorId: classItem.majorId ?? classItem.major,
                majorName: classItem.major,
              };
              onCreate(course);
              toast.success("درس جدید ایجاد شد");
              onOpenChange(false);
            }}
          >
            ذخیره درس
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function QuickCreateTeacherDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (teacher: TeacherOption) => void;
}) {
  const [form, setForm] = useState({ name: "", code: "", phone: "", active: true });
  useEffect(() => {
    if (open) setForm({ name: "", code: "", phone: "", active: true });
  }, [open]);
  const valid = Boolean(form.name.trim());
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="sm:max-w-md">
        <DialogHeader className="text-right">
          <DialogTitle>ایجاد معلم جدید</DialogTitle>
          <DialogDescription>
            معلم جدید پس از ذخیره برای اولین درس بدون معلم انتخاب می‌شود.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <Field label="نام معلم">
            <Input
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
          </Field>
          <Field label="کد پرسنلی (اختیاری)">
            <Input
              dir="ltr"
              value={form.code}
              onChange={(event) => setForm({ ...form, code: event.target.value })}
            />
          </Field>
          <Field label="شماره موبایل (اختیاری)">
            <Input
              dir="ltr"
              type="tel"
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
            />
          </Field>
          <div className="flex items-center justify-between rounded-lg border px-3 py-2">
            <div>
              <Label>وضعیت فعال</Label>
              <p className="text-xs text-muted-foreground">قابل انتخاب برای کلاس‌ها</p>
            </div>
            <Switch
              checked={form.active}
              onCheckedChange={(active) => setForm({ ...form, active })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            انصراف
          </Button>
          <Button
            disabled={!valid}
            onClick={() => {
              const teacher = {
                ...form,
                name: form.name.trim(),
                code: form.code.trim(),
                phone: form.phone.trim(),
                id: crypto.randomUUID(),
                availableDays: [] as Weekday[],
              };
              onCreate(teacher);
              toast.success("معلم جدید ایجاد شد");
              onOpenChange(false);
            }}
          >
            ذخیره معلم
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
