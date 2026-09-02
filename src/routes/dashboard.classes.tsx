import { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Header } from "@/components/header";
import { ClassAssignmentsSheet } from "@/components/classes/class-assignments-sheet";
import { ClassUnavailableSlotsDialog } from "@/components/classes/class-unavailable-slots-dialog";
import { GRADE_OPTIONS, type ClassViewModel, useClassManagementData } from "@/lib/class-management";
import { withAppName } from "@/lib/branding";
import {
  createClassTimetableFeedbackController,
  type ClassTimetableFeedback,
} from "@/lib/class-timetable-feedback";
import {
  getClassErrorMessage,
  getClassDeleteErrorMessage,
  getClassFieldErrors,
  type ClassFieldErrors,
} from "@/lib/class-errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { usePublishedClassScheduleCheck } from "@/lib/timetable-queries";
import {
  Plus,
  Trash2,
  GraduationCap,
  CalendarClock,
  CalendarX2,
  Check,
  Filter,
  LoaderCircle,
  RefreshCw,
  UserRoundCheck,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/classes")({
  head: () => ({
    meta: [
      { title: withAppName("کلاس‌ها") },
      { name: "description", content: "مدیریت کلاس‌ها و بخش‌های مدرسه" },
    ],
  }),
  component: ClassesPage,
});

function EmptyState({ onAddClass }: { onAddClass: () => void }) {
  return (
    <Card className="flex flex-col items-center justify-center p-12 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <GraduationCap className="h-8 w-8 text-primary" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">هنوز کلاسی ثبت نشده</h3>
      <p className="mt-2 text-sm text-muted-foreground max-w-sm">
        با ایجاد اولین کلاس شروع کنید و برای درس‌های آن معلم انتخاب کنید.
      </p>
      <Button className="mt-6" onClick={onAddClass}>
        <Plus className="me-2 h-4 w-4" />
        افزودن کلاس
      </Button>
    </Card>
  );
}

function ViewTimetableAction({
  classItem,
  feedback,
  isChecking,
  showLabel = false,
  onClick,
}: {
  classItem: ClassViewModel;
  feedback: ClassTimetableFeedback | null;
  isChecking: boolean;
  showLabel?: boolean;
  onClick: (classItem: ClassViewModel) => void;
}) {
  const message = feedback?.classId === classItem.id ? feedback.message : null;

  return (
    <Popover open={Boolean(message)}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant={showLabel ? "outline" : "ghost"}
              size={showLabel ? "default" : "icon"}
              className={showLabel ? "w-full" : undefined}
              aria-label={`مشاهده برنامه ${classItem.name}`}
              aria-busy={isChecking || undefined}
              disabled={isChecking}
              onClick={() => onClick(classItem)}
            >
              {isChecking ? (
                <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" />
              ) : (
                <CalendarClock className={showLabel ? "me-2 h-4 w-4" : "h-4 w-4"} />
              )}
              {showLabel && "مشاهده برنامه"}
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>مشاهده برنامه</TooltipContent>
      </Tooltip>
      <PopoverContent
        side="bottom"
        align="center"
        sideOffset={6}
        dir="rtl"
        role="status"
        aria-live="polite"
        className="w-auto max-w-[min(14rem,calc(100vw-2rem))] px-3 py-2 text-center text-xs text-muted-foreground shadow-sm data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 motion-reduce:animate-none"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        {message}
      </PopoverContent>
    </Popover>
  );
}

type ClassFormData = Pick<ClassViewModel, "name" | "gradeId" | "majorId">;
type MajorOption = { value: string; label: string };

const emptyClassForm = (): ClassFormData => ({ name: "", gradeId: "", majorId: "" });

function ClassDialog({
  open,
  onOpenChange,
  onSave,
  majorOptions,
  majorsPending,
  majorsError,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: ClassFormData) => Promise<void>;
  majorOptions: MajorOption[];
  majorsPending: boolean;
  majorsError: Error | null;
}) {
  const [formData, setFormData] = useState<ClassFormData>(emptyClassForm);
  const [isSaving, setIsSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<ClassFieldErrors>({});

  useEffect(() => {
    if (!open) return;
    setFormData(emptyClassForm());
    setSubmitError(null);
    setFieldErrors({});
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    setSubmitError(null);
    setFieldErrors({});
    try {
      await onSave(formData);
      onOpenChange(false);
    } catch (error) {
      setFieldErrors(getClassFieldErrors(error));
      setSubmitError(getClassErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !isSaving && onOpenChange(nextOpen)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>افزودن کلاس جدید</DialogTitle>
          <DialogDescription>نام، پایه و رشته کلاس را مشخص کنید.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="className">نام کلاس</Label>
              <Input
                id="className"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  setFieldErrors((current) => ({ ...current, name: undefined }));
                }}
                placeholder="مثلاً کلاس دهم الف"
                required
              />
              {fieldErrors.name && <p className="text-xs text-destructive">{fieldErrors.name}</p>}
            </div>
            <div className="space-y-2">
              <Label>پایه</Label>
              <Select
                value={formData.gradeId}
                onValueChange={(gradeId) => {
                  setFormData({ ...formData, gradeId });
                  setFieldErrors((current) => ({ ...current, gradeId: undefined }));
                }}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="انتخاب پایه" />
                </SelectTrigger>
                <SelectContent>
                  {GRADE_OPTIONS.map((grade) => (
                    <SelectItem key={grade.value} value={grade.value}>
                      {grade.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors.gradeId && (
                <p className="text-xs text-destructive">{fieldErrors.gradeId}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>رشته تحصیلی</Label>
              <Select
                value={formData.majorId}
                onValueChange={(majorId) => {
                  setFormData({ ...formData, majorId });
                  setFieldErrors((current) => ({ ...current, majorId: undefined }));
                }}
                required
                disabled={majorsPending || Boolean(majorsError)}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={majorsPending ? "در حال دریافت رشته‌ها..." : "انتخاب رشته"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {majorOptions.map((major) => (
                    <SelectItem key={major.value} value={major.value}>
                      {major.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {majorsError && (
                <p className="text-xs text-destructive">دریافت رشته‌های تحصیلی انجام نشد.</p>
              )}
              {fieldErrors.majorId && (
                <p className="text-xs text-destructive">{fieldErrors.majorId}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            {submitError && <p className="text-sm text-destructive">{submitError}</p>}
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              انصراف
            </Button>
            <Button
              type="submit"
              disabled={
                isSaving ||
                majorsPending ||
                Boolean(majorsError) ||
                !formData.name.trim() ||
                !formData.gradeId ||
                !formData.majorId
              }
            >
              {isSaving ? "در حال ذخیره..." : "افزودن کلاس"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RenameClassDialog({
  open,
  onOpenChange,
  classItem,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classItem: ClassViewModel | null;
  onSave: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(classItem?.name ?? "");
      setSubmitError(null);
      setFieldError(null);
    }
  }, [classItem, open]);

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !isSaving && onOpenChange(nextOpen)}>
      <DialogContent dir="rtl" className="sm:max-w-sm">
        <DialogHeader className="text-right">
          <DialogTitle>ویرایش نام کلاس</DialogTitle>
          <DialogDescription>پایه و رشته کلاس پس از ایجاد قابل تغییر نیستند.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            if (!name.trim() || isSaving) return;
            setIsSaving(true);
            setSubmitError(null);
            setFieldError(null);
            try {
              await onSave(name.trim());
              onOpenChange(false);
            } catch (error) {
              setFieldError(getClassFieldErrors(error).name ?? null);
              setSubmitError(getClassErrorMessage(error));
            } finally {
              setIsSaving(false);
            }
          }}
        >
          <div className="space-y-2 py-4">
            <Label htmlFor="rename-class">نام کلاس</Label>
            <Input
              id="rename-class"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setFieldError(null);
              }}
              autoFocus
            />
            {fieldError && <p className="text-xs text-destructive">{fieldError}</p>}
          </div>
          <DialogFooter>
            {submitError && <p className="text-sm text-destructive">{submitError}</p>}
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              انصراف
            </Button>
            <Button
              type="submit"
              disabled={isSaving || !name.trim() || name.trim() === classItem?.name}
            >
              {isSaving ? "در حال ذخیره..." : "ذخیره نام"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ClassesPage() {
  const navigate = useNavigate();
  const publishedClassSchedule = usePublishedClassScheduleCheck();
  const [assignmentClass, setAssignmentClass] = useState<ClassViewModel | null>(null);
  const [unavailabilityClass, setUnavailabilityClass] = useState<ClassViewModel | null>(null);
  const {
    classes,
    majorOptions,
    courses,
    teachers,
    assignments,
    activeClassAssignments,
    classesRepository,
    majorsRepository,
    coursesRepository,
    teachersRepository,
    activeClassAssignmentsRepository,
  } = useClassManagementData(assignmentClass?.id);
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [majorFilter, setMajorFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [renamingClass, setRenamingClass] = useState<ClassViewModel | null>(null);
  const [classToDelete, setClassToDelete] = useState<ClassViewModel | null>(null);
  const [isDeletingClass, setIsDeletingClass] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [checkingTimetableClassId, setCheckingTimetableClassId] = useState<string | null>(null);
  const [timetableFeedback, setTimetableFeedback] = useState<ClassTimetableFeedback | null>(null);
  const timetableFeedbackController = useRef(
    createClassTimetableFeedbackController(setTimetableFeedback),
  );

  useEffect(
    () => () => {
      timetableFeedbackController.current.dispose();
    },
    [],
  );
  const filteredClasses = classes.filter((c) => {
    const normalizedSearch = search.toLowerCase();
    const matchesSearch =
      c.name.toLowerCase().includes(normalizedSearch) ||
      c.majorName.toLowerCase().includes(normalizedSearch);
    const matchesGrade = gradeFilter === "all" || c.gradeId === gradeFilter;
    const matchesMajor = majorFilter === "all" || c.majorId === majorFilter;
    return matchesSearch && matchesGrade && matchesMajor;
  });

  const activeFilterCount = Number(gradeFilter !== "all") + Number(majorFilter !== "all");

  const handleSave = async (data: ClassFormData) => {
    try {
      await classesRepository.create({
        name: data.name,
        gradeId: data.gradeId,
        majorId: data.majorId,
      });
      toast.success("کلاس با موفقیت اضافه شد");
    } catch (error) {
      toast.error("ایجاد کلاس انجام نشد", {
        description: getClassErrorMessage(error),
      });
      throw error;
    }
  };

  const handleDelete = async (classItem: ClassViewModel) => {
    try {
      await classesRepository.remove(classItem.id);
      toast.success("کلاس با موفقیت حذف شد");
    } catch (error) {
      toast.error("حذف کلاس انجام نشد", {
        description: getClassErrorMessage(error),
      });
      throw error;
    }
  };

  const openAddDialog = () => setDialogOpen(true);
  const renameClass = async (name: string) => {
    if (!renamingClass) return;
    const current = classesRepository.items.find((item) => item.id === renamingClass.id);
    try {
      if (!current) throw new Error("کلاس انتخاب‌شده دیگر در فهرست مدرسه وجود ندارد.");
      await classesRepository.update({ id: current.id, input: { name } });
      toast.success("نام کلاس به‌روز شد");
    } catch (error) {
      toast.error("ویرایش کلاس انجام نشد", {
        description: getClassErrorMessage(error),
      });
      throw error;
    }
  };
  const assignmentCount = (classId: string) =>
    assignments.filter((assignment) => assignment.classId === classId).length;
  const handleViewTimetable = async (classItem: ClassViewModel) => {
    if (checkingTimetableClassId === classItem.id) return;
    if (!publishedClassSchedule.canCheck) {
      timetableFeedbackController.current.show({
        classId: classItem.id,
        message: "وضعیت برنامه قابل بررسی نیست.",
      });
      return;
    }

    setCheckingTimetableClassId(classItem.id);
    try {
      const isPublished = await publishedClassSchedule.check(classItem.id);
      if (!isPublished) {
        timetableFeedbackController.current.show({
          classId: classItem.id,
          message: "برنامه هنوز آماده نیست.",
        });
        return;
      }

      timetableFeedbackController.current.clear();
      await navigate({ to: "/dashboard/timetable" });
    } catch {
      timetableFeedbackController.current.show({
        classId: classItem.id,
        message: "وضعیت برنامه قابل بررسی نیست.",
      });
    } finally {
      setCheckingTimetableClassId(null);
    }
  };

  return (
    <div className="flex flex-col">
      <Header title="کلاس‌ها" description="مدیریت کلاس‌ها و بخش‌های مدرسه" />
      <div className="space-y-6 p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            <SearchInput
              containerClassName="w-full flex-1 sm:max-w-sm"
              placeholder="جستجوی کلاس‌ها..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full gap-2 sm:w-auto">
                  <Filter className="h-4 w-4" />
                  فیلتر
                  {activeFilterCount > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
                      {activeFilterCount.toLocaleString("fa-IR")}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-72 space-y-4 p-3">
                <div className="space-y-2">
                  <p className="px-1 text-xs font-semibold text-muted-foreground">پایه تحصیلی</p>
                  <div className="grid gap-1">
                    {[{ value: "all", label: "همه پایه‌ها" }, ...GRADE_OPTIONS].map((grade) => (
                      <Button
                        key={grade.value}
                        type="button"
                        variant="ghost"
                        className="h-8 justify-between px-2 font-normal"
                        onClick={() => setGradeFilter(grade.value)}
                      >
                        <span>{grade.label}</span>
                        {gradeFilter === grade.value && <Check className="h-4 w-4 text-primary" />}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 border-t pt-3">
                  <p className="px-1 text-xs font-semibold text-muted-foreground">رشته تحصیلی</p>
                  <div className="grid gap-1">
                    {[{ value: "all", label: "همه رشته‌ها" }, ...majorOptions].map((major) => (
                      <Button
                        key={major.value}
                        type="button"
                        variant="ghost"
                        className="h-8 justify-between px-2 font-normal"
                        onClick={() => setMajorFilter(major.value)}
                      >
                        <span>{major.label}</span>
                        {majorFilter === major.value && <Check className="h-4 w-4 text-primary" />}
                      </Button>
                    ))}
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  disabled={activeFilterCount === 0}
                  onClick={() => {
                    setGradeFilter("all");
                    setMajorFilter("all");
                  }}
                >
                  پاک‌کردن فیلترها
                </Button>
              </PopoverContent>
            </Popover>
          </div>
          <Button onClick={openAddDialog}>
            <Plus className="me-2 h-4 w-4" />
            افزودن کلاس
          </Button>
        </div>

        {classesRepository.query.isPending || majorsRepository.isPending ? (
          <Card className="flex min-h-52 flex-col items-center justify-center p-8 text-center">
            <LoaderCircle className="mb-3 h-8 w-8 animate-spin text-primary" />
            <p className="font-medium">در حال دریافت کلاس‌ها...</p>
          </Card>
        ) : classesRepository.query.isError || majorsRepository.isError ? (
          <Card className="flex min-h-52 flex-col items-center justify-center p-8 text-center">
            <p className="font-medium text-destructive">دریافت کلاس‌ها انجام نشد.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {getClassErrorMessage(classesRepository.query.error ?? majorsRepository.error)}
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-4"
              onClick={() => {
                void classesRepository.query.refetch();
                void majorsRepository.refetch();
              }}
            >
              <RefreshCw className="me-2 h-4 w-4" />
              تلاش دوباره
            </Button>
          </Card>
        ) : filteredClasses.length === 0 &&
          search === "" &&
          gradeFilter === "all" &&
          majorFilter === "all" ? (
          <EmptyState onAddClass={openAddDialog} />
        ) : (
          <>
            {filteredClasses.length > 0 && (
              <div className="hidden overflow-hidden rounded-xl border bg-card md:block">
                <TooltipProvider>
                  <Table dir="rtl">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-14 text-center">ردیف</TableHead>
                        <TableHead className="w-px whitespace-nowrap text-center">
                          نام کلاس
                        </TableHead>
                        <TableHead className="text-center">پایه</TableHead>
                        <TableHead className="text-center">رشته</TableHead>
                        <TableHead className="text-center">مدیریت کلاس</TableHead>
                        <TableHead className="whitespace-nowrap text-center">
                          روز و زنگ خالی
                        </TableHead>
                        <TableHead className="w-28 text-center">مشاهده برنامه</TableHead>
                        <TableHead className="w-20 text-center">حذف</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredClasses.map((classItem, index) => {
                        const hasAssignments = assignmentCount(classItem.id) > 0;
                        return (
                          <TableRow key={classItem.id}>
                            <TableCell className="text-center font-medium text-muted-foreground">
                              {index + 1}
                            </TableCell>
                            <TableCell className="w-px whitespace-nowrap text-center">
                              <Button
                                type="button"
                                variant="link"
                                className="h-auto p-0 font-semibold text-foreground"
                                onClick={() => setRenamingClass(classItem)}
                              >
                                {classItem.name}
                              </Button>
                            </TableCell>
                            <TableCell className="text-center">{classItem.gradeName}</TableCell>
                            <TableCell className="text-center">{classItem.majorName}</TableCell>
                            <TableCell className="text-center">
                              <Button
                                type="button"
                                variant={hasAssignments ? "outline" : "default"}
                                size="sm"
                                onClick={() => setAssignmentClass(classItem)}
                              >
                                <UserRoundCheck
                                  className={
                                    hasAssignments ? "me-2 h-4 w-4 text-primary" : "me-2 h-4 w-4"
                                  }
                                />
                                تنظیم دروس
                              </Button>
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="whitespace-nowrap"
                                onClick={() => setUnavailabilityClass(classItem)}
                              >
                                <CalendarX2 className="me-2 h-4 w-4" aria-hidden="true" />
                                تنظیم
                              </Button>
                            </TableCell>
                            <TableCell className="text-center">
                              <ViewTimetableAction
                                classItem={classItem}
                                feedback={timetableFeedback}
                                isChecking={checkingTimetableClassId === classItem.id}
                                onClick={(item) => void handleViewTimetable(item)}
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive"
                                    aria-label={`حذف کلاس ${classItem.name}`}
                                    onClick={() => setClassToDelete(classItem)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>حذف کلاس</TooltipContent>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TooltipProvider>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2 md:hidden">
              {filteredClasses.length === 0 ? (
                <div className="col-span-full rounded-xl border border-dashed px-4 py-10 text-center">
                  <p className="font-medium">کلاسی با فیلترهای انتخاب‌شده یافت نشد</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    فیلترها یا عبارت جستجو را تغییر دهید.
                  </p>
                </div>
              ) : (
                filteredClasses.map((classItem) => {
                  const hasAssignments = assignmentCount(classItem.id) > 0;
                  return (
                    <Card
                      key={classItem.id}
                      className="transition-all hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <CardHeader className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                              <GraduationCap className="h-5 w-5 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <CardTitle className="truncate text-base leading-6">
                                <Button
                                  type="button"
                                  variant="link"
                                  className="h-auto p-0 font-semibold text-foreground"
                                  onClick={() => setRenamingClass(classItem)}
                                >
                                  {classItem.name}
                                </Button>
                              </CardTitle>
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <span className="rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                                  {classItem.gradeName}
                                </span>
                                <span className="rounded-md bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                                  رشته: {classItem.majorName}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="mt-4 grid gap-2 border-t pt-4">
                          <Button type="button" onClick={() => setAssignmentClass(classItem)}>
                            <UserRoundCheck
                              className={
                                hasAssignments ? "me-2 h-4 w-4 text-primary" : "me-2 h-4 w-4"
                              }
                            />
                            تنظیم دروس
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="min-h-10 justify-between"
                            onClick={() => setUnavailabilityClass(classItem)}
                          >
                            <span className="flex items-center gap-2">
                              <CalendarX2 className="h-4 w-4" aria-hidden="true" />
                              روز و زنگ خالی
                            </span>
                            <span className="text-xs text-muted-foreground">تنظیم</span>
                          </Button>
                          <div className="grid grid-cols-2 gap-2">
                            <TooltipProvider>
                              <ViewTimetableAction
                                classItem={classItem}
                                feedback={timetableFeedback}
                                isChecking={checkingTimetableClassId === classItem.id}
                                showLabel
                                onClick={(item) => void handleViewTimetable(item)}
                              />
                            </TooltipProvider>
                            <Button
                              type="button"
                              variant="outline"
                              className="text-destructive"
                              aria-label={`حذف کلاس ${classItem.name}`}
                              onClick={() => setClassToDelete(classItem)}
                            >
                              <Trash2 className="me-2 h-4 w-4" /> حذف کلاس
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>

      <ClassDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSave}
        majorOptions={majorOptions}
        majorsPending={majorsRepository.isPending}
        majorsError={majorsRepository.error}
      />

      <RenameClassDialog
        open={Boolean(renamingClass)}
        onOpenChange={(open) => !open && setRenamingClass(null)}
        classItem={renamingClass}
        onSave={renameClass}
      />

      {unavailabilityClass ? (
        <ClassUnavailableSlotsDialog
          key={unavailabilityClass.id}
          open
          classItem={unavailabilityClass}
          onOpenChange={(open) => !open && setUnavailabilityClass(null)}
        />
      ) : null}

      <AlertDialog
        open={Boolean(classToDelete)}
        onOpenChange={(open) => {
          if (!isDeletingClass && !open) {
            setClassToDelete(null);
            setDeleteError(null);
          }
        }}
      >
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader className="text-right">
            <AlertDialogTitle>حذف کلاس {classToDelete?.name}</AlertDialogTitle>
            <AlertDialogDescription>
              کلاس «{classToDelete?.name}» فقط در صورتی حذف می‌شود که درس یا برنامه وابسته‌ای نداشته
              باشد. معلمان و درس‌های مدرسه حذف نخواهند شد.
            </AlertDialogDescription>
            {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingClass}>انصراف</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeletingClass}
              onClick={async (event) => {
                event.preventDefault();
                if (!classToDelete || isDeletingClass) return;
                setIsDeletingClass(true);
                setDeleteError(null);
                try {
                  await handleDelete(classToDelete);
                  setClassToDelete(null);
                } catch (error) {
                  setDeleteError(getClassDeleteErrorMessage(error));
                } finally {
                  setIsDeletingClass(false);
                }
              }}
            >
              {isDeletingClass ? "در حال حذف..." : "حذف کلاس"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ClassAssignmentsSheet
        open={Boolean(assignmentClass)}
        onOpenChange={(open) => !open && setAssignmentClass(null)}
        classItem={assignmentClass}
        assignments={activeClassAssignments}
        assignmentsStatus={activeClassAssignmentsRepository.query.status}
        assignmentsError={activeClassAssignmentsRepository.query.error}
        courses={courses}
        teachers={teachers}
        onSaveAssignments={async (classId, nextAssignments) => {
          return activeClassAssignmentsRepository.replaceForClass({
            classId,
            assignments: nextAssignments,
          });
        }}
        onRetryAssignments={() => {
          void activeClassAssignmentsRepository.query.refetch();
        }}
        onCreateCourse={async (course) => {
          return coursesRepository.create(course);
        }}
        onUpdateCourse={async (id, course) => {
          await coursesRepository.update({ id, input: course });
        }}
        onCreateTeacher={async (teacher) => {
          return teachersRepository.create(teacher);
        }}
        onUpdateTeacher={async (id, teacher) => {
          await teachersRepository.update({ id, input: teacher });
        }}
      />
    </div>
  );
}
