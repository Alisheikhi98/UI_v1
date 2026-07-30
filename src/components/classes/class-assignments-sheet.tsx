import { useEffect, useState } from "react";
import {
  BookOpen,
  Check,
  ChevronsUpDown,
  GraduationCap,
  Pencil,
  Plus,
  Search,
  Trash2,
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
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  TeacherDetailsDialog,
  type TeacherDetailsInput,
} from "@/components/teachers/teacher-details-dialog";
import {
  selectCoursePickerOptions,
  selectTeacherPickerOptions,
  type ClassViewModel,
  type PickerOption,
} from "@/lib/class-management";
import type {
  ClassAssignmentReplacementInput,
  CourseCreateInput,
  CourseUpdateInput,
  TeacherCreateInput,
  TeacherUpdateInput,
} from "@/lib/repositories";
import type { ClassAssignment, Course, Teacher } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classItem: ClassViewModel | null;
  assignments: ClassAssignment[];
  courses: Course[];
  teachers: Teacher[];
  onSaveAssignments: (
    classId: string,
    assignments: readonly ClassAssignmentReplacementInput[],
  ) => Promise<void>;
  onCreateCourse: (course: CourseCreateInput) => void;
  onUpdateCourse: (id: string, course: CourseUpdateInput) => void;
  onCreateTeacher: (teacher: TeacherCreateInput) => void;
  onUpdateTeacher: (id: string, teacher: TeacherUpdateInput) => void;
}

type DraftAssignment = ClassAssignmentReplacementInput & { draftId: string };

const serializeDraft = (items: DraftAssignment[]) =>
  JSON.stringify(
    [...items]
      .sort((first, second) => first.draftId.localeCompare(second.draftId))
      .map(({ id, classId, courseId, teacherId, weeklyPeriods }) => ({
        id,
        classId,
        courseId,
        teacherId,
        weeklyPeriods,
      })),
  );

const isPositiveInteger = (value: number) => Number.isInteger(value) && value > 0;

const isDraftValid = (items: DraftAssignment[]) => {
  const selectedCourseIds = items.map((item) => item.courseId).filter(Boolean);
  const selectedTeacherIds = items.map((item) => item.teacherId).filter(Boolean);
  return (
    selectedCourseIds.length === new Set(selectedCourseIds).size &&
    selectedTeacherIds.length === new Set(selectedTeacherIds).size &&
    items.every(
      (item) => Boolean(item.courseId && item.teacherId) && isPositiveInteger(item.weeklyPeriods),
    )
  );
};

export function ClassAssignmentsSheet({
  open,
  onOpenChange,
  classItem,
  assignments,
  courses,
  teachers,
  onSaveAssignments,
  onCreateCourse,
  onUpdateCourse,
  onCreateTeacher,
  onUpdateTeacher,
}: Props) {
  const [draft, setDraft] = useState<DraftAssignment[]>([]);
  const [initialDraft, setInitialDraft] = useState<DraftAssignment[]>([]);
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
  const [createCourseOpen, setCreateCourseOpen] = useState(false);
  const [courseToRename, setCourseToRename] = useState<Course | null>(null);
  const [createTeacherOpen, setCreateTeacherOpen] = useState(false);
  const [teacherToEdit, setTeacherToEdit] = useState<Teacher | null>(null);

  useEffect(() => {
    if (!open || !classItem) return;
    const current = assignments
      .filter((assignment) => assignment.classId === classItem.id)
      .map((assignment) => ({ ...structuredClone(assignment), draftId: assignment.id }));
    setDraft(current);
    setInitialDraft(structuredClone(current));
  }, [assignments, classItem, open]);

  if (!classItem) return null;

  const teacherOptions = selectTeacherPickerOptions(teachers);
  const courseOptions = selectCoursePickerOptions(courses);
  const isDirty = serializeDraft(draft) !== serializeDraft(initialDraft);
  const draftIsValid = isDraftValid(draft);

  const requestClose = () => {
    if (isDirty) {
      setConfirmCloseOpen(true);
      return;
    }
    onOpenChange(false);
  };

  const addEmptyRow = () => {
    setDraft((current) => [
      ...current,
      {
        draftId: crypto.randomUUID(),
        classId: classItem.id,
        courseId: "",
        teacherId: "",
        weeklyPeriods: 1,
      },
    ]);
  };

  const updateAssignment = (
    draftId: string,
    changes: Partial<Pick<ClassAssignment, "courseId" | "teacherId" | "weeklyPeriods">>,
  ) => {
    setDraft((current) =>
      current.map((assignment) =>
        assignment.draftId === draftId ? { ...assignment, ...changes } : assignment,
      ),
    );
  };

  const saveChanges = async () => {
    if (!draftIsValid) {
      toast.error("برای ذخیره، اطلاعات همه ردیف‌ها را به‌درستی تکمیل کنید");
      return;
    }
    try {
      const replacement = draft.map(({ draftId: _draftId, ...assignment }) => assignment);
      await onSaveAssignments(classItem.id, structuredClone(replacement));
      setInitialDraft(structuredClone(draft));
      toast.success("تنظیمات دروس کلاس ذخیره شد");
      onOpenChange(false);
    } catch (error) {
      toast.error("ذخیره تنظیمات کلاس انجام نشد", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : requestClose())}>
        <DialogContent
          dir="rtl"
          className="flex max-h-[92vh] w-[calc(100%-1rem)] max-w-5xl flex-col gap-0 overflow-hidden p-0 sm:w-[calc(100%-2rem)] sm:max-w-5xl"
        >
          <DialogHeader className="relative shrink-0 items-center border-b bg-muted/20 px-12 py-5 text-center sm:px-14">
            <div className="absolute right-5 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg bg-primary/10 text-primary sm:flex">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div className="flex w-full flex-col items-center px-2 text-center">
              <DialogTitle className="w-full truncate text-center text-lg">مدیریت کلاس</DialogTitle>
              <p className="mt-1 w-full text-center text-sm text-muted-foreground">
                {classItem.gradeName} • رشته {classItem.majorName}
              </p>
              <DialogDescription className="mt-2 w-full text-center">
                درس، معلم و تعداد زنگ هفتگی هر ردیف را مشخص کنید.
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold">دروس این کلاس</h2>
                <p className="text-xs text-muted-foreground">
                  هر ردیف یک درس و معلم آن را مشخص می‌کند.
                </p>
              </div>
              <Button
                type="button"
                onClick={addEmptyRow}
                className="bg-emerald-600 text-white hover:bg-emerald-700"
              >
                <Plus className="me-2 h-4 w-4" />
                افزودن
              </Button>
            </div>

            <div className="overflow-x-auto rounded-lg border">
              <Table className="min-w-[720px]">
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="w-14 text-center">ردیف</TableHead>
                    <TableHead className="w-[38%] text-center">درس</TableHead>
                    <TableHead className="w-[34%] text-center">معلم</TableHead>
                    <TableHead className="w-40 text-center">زنگ هفتگی</TableHead>
                    <TableHead className="w-20 text-center">عملیات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {draft.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-56 text-center">
                        <div className="flex flex-col items-center">
                          <BookOpen className="mb-3 h-8 w-8 text-muted-foreground" />
                          <p className="font-medium">هنوز درسی برای این کلاس ثبت نشده است.</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            برای شروع یک ردیف درس اضافه کنید.
                          </p>
                          <Button className="mt-4" variant="outline" onClick={addEmptyRow}>
                            <Plus className="me-2 h-4 w-4" />
                            افزودن اولین درس
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    draft.map((assignment, index) => {
                      const selectedByOtherRows = new Set(
                        draft
                          .filter((item) => item.draftId !== assignment.draftId)
                          .map((item) => item.courseId)
                          .filter(Boolean),
                      );
                      const courseInvalid = !assignment.courseId;
                      const teacherInvalid = !assignment.teacherId;
                      const periodsInvalid = !isPositiveInteger(assignment.weeklyPeriods);

                      return (
                        <TableRow key={assignment.draftId}>
                          <TableCell className="text-center align-top font-medium text-muted-foreground">
                            {index + 1}
                          </TableCell>
                          <TableCell className="align-top">
                            <ManagedEntityPicker
                              value={assignment.courseId}
                              placeholder="انتخاب درس"
                              createLabel="درس جدید"
                              searchPlaceholder="جستجوی درس..."
                              emptyText="درسی یافت نشد"
                              options={courseOptions.map((course) => ({
                                ...course,
                                disabled: selectedByOtherRows.has(course.id),
                              }))}
                              onChange={(courseId) =>
                                updateAssignment(assignment.draftId, { courseId })
                              }
                              onCreate={() => setCreateCourseOpen(true)}
                              onEdit={(courseId) =>
                                setCourseToRename(
                                  courses.find((course) => course.id === courseId) ?? null,
                                )
                              }
                              invalid={courseInvalid}
                            />
                            {courseInvalid && (
                              <p className="mt-1 text-xs text-destructive">
                                انتخاب درس الزامی است.
                              </p>
                            )}
                          </TableCell>
                          <TableCell className="align-top">
                            <ManagedEntityPicker
                              value={assignment.teacherId}
                              placeholder="انتخاب معلم"
                              createLabel="معلم جدید"
                              searchPlaceholder="جستجوی معلم..."
                              emptyText="معلمی یافت نشد"
                              options={teacherOptions}
                              onChange={(teacherId) =>
                                updateAssignment(assignment.draftId, { teacherId })
                              }
                              onCreate={() => setCreateTeacherOpen(true)}
                              onEdit={(teacherId) =>
                                setTeacherToEdit(
                                  teachers.find((teacher) => teacher.id === teacherId) ?? null,
                                )
                              }
                              invalid={teacherInvalid}
                            />
                            {teacherInvalid && (
                              <p className="mt-1 text-xs text-destructive">
                                انتخاب معلم الزامی است.
                              </p>
                            )}
                          </TableCell>
                          <TableCell className="align-top">
                            <Input
                              type="number"
                              inputMode="numeric"
                              min={1}
                              step={1}
                              value={
                                Number.isFinite(assignment.weeklyPeriods)
                                  ? assignment.weeklyPeriods
                                  : ""
                              }
                              aria-invalid={periodsInvalid}
                              className={cn(
                                "mx-auto w-24 text-center",
                                periodsInvalid && "border-destructive",
                              )}
                              onChange={(event) =>
                                updateAssignment(assignment.draftId, {
                                  weeklyPeriods:
                                    event.target.value === ""
                                      ? Number.NaN
                                      : Number(event.target.value),
                                })
                              }
                            />
                            {periodsInvalid && (
                              <p className="mt-1 text-center text-xs text-destructive">
                                عدد صحیح مثبت وارد کنید.
                              </p>
                            )}
                          </TableCell>
                          <TableCell className="text-center align-top">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                              aria-label="حذف ردیف درس"
                              onClick={() =>
                                setDraft((current) =>
                                  current.filter((item) => item.draftId !== assignment.draftId),
                                )
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <DialogFooter className="shrink-0 flex-col-reverse gap-2 border-t bg-background px-4 py-3 sm:flex-row sm:px-6">
            <Button type="button" variant="ghost" onClick={requestClose}>
              بستن
            </Button>
            <div className="hidden flex-1 text-xs text-muted-foreground sm:block">
              {!draftIsValid && draft.length > 0
                ? "برای ذخیره، همه ردیف‌ها را کامل کنید."
                : isDirty
                  ? "تغییرات هنوز ذخیره نشده‌اند."
                  : "همه تغییرات ذخیره شده‌اند."}
            </div>
            <Button
              type="button"
              className="min-w-40"
              disabled={!isDirty || !draftIsValid}
              onClick={saveChanges}
            >
              <Check className="me-2 h-4 w-4" />
              ذخیره تنظیمات کلاس
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CourseNameDialog
        open={createCourseOpen}
        onOpenChange={setCreateCourseOpen}
        title="ایجاد درس جدید"
        courses={courses}
        onSave={(name) => {
          onCreateCourse({
            name,
            active: true,
            gradeId: classItem.gradeId,
            majorId: classItem.majorId,
            category: "specialized",
            code: "",
            weeklyHours: 1,
            color: "#1E40AF",
          });
          toast.success("درس جدید ایجاد شد");
        }}
      />

      <CourseNameDialog
        open={Boolean(courseToRename)}
        onOpenChange={(next) => {
          if (!next) setCourseToRename(null);
        }}
        title="ویرایش نام درس"
        initialName={courseToRename?.name}
        courses={courses}
        excludedCourseId={courseToRename?.id}
        onSave={(name) => {
          if (!courseToRename) return;
          onUpdateCourse(courseToRename.id, { name });
          toast.success("نام درس ویرایش شد");
          setCourseToRename(null);
        }}
      />

      <TeacherDetailsDialog
        open={createTeacherOpen}
        onOpenChange={setCreateTeacherOpen}
        onSave={(details) => {
          onCreateTeacher({
            name: details.name,
            email: "",
            phone: details.phone || "",
            personnel_code: details.personnel_code || "",
            courseIds: [],
            availableDays: [],
            status: "active",
          });
          toast.success("معلم جدید ایجاد شد");
        }}
      />

      <TeacherDetailsDialog
        open={Boolean(teacherToEdit)}
        onOpenChange={(next) => {
          if (!next) setTeacherToEdit(null);
        }}
        teacher={
          teacherToEdit
            ? {
                name: teacherToEdit.name,
                personnel_code: teacherToEdit.personnel_code,
                phone: teacherToEdit.phone,
              }
            : null
        }
        onSave={(details: TeacherDetailsInput) => {
          if (!teacherToEdit) return;
          onUpdateTeacher(teacherToEdit.id, {
            name: details.name,
            personnel_code: details.personnel_code || "",
            phone: details.phone || "",
          });
          toast.success("اطلاعات معلم ویرایش شد");
          setTeacherToEdit(null);
        }}
      />

      <AlertDialog open={confirmCloseOpen} onOpenChange={setConfirmCloseOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader className="text-right">
            <AlertDialogTitle>تغییرات ذخیره نشده</AlertDialogTitle>
            <AlertDialogDescription>
              تغییرات تنظیم دروس ذخیره نشده است. آیا بدون ذخیره خارج می‌شوید؟
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

function ManagedEntityPicker({
  value,
  placeholder,
  createLabel,
  searchPlaceholder,
  emptyText,
  options,
  invalid,
  onChange,
  onCreate,
  onEdit,
}: {
  value: string;
  placeholder: string;
  createLabel: string;
  searchPlaceholder: string;
  emptyText: string;
  options: Array<PickerOption & { disabled?: boolean }>;
  invalid?: boolean;
  onChange: (value: string) => void;
  onCreate: () => void;
  onEdit: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = options.find((option) => option.id === value);
  const normalizedQuery = normalizeCourseName(query);
  const filteredOptions = options.filter((option) =>
    normalizeCourseName(option.searchText).includes(normalizedQuery),
  );

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) setQuery("");
  };

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange} dir="rtl">
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-invalid={invalid}
          className={cn(
            "w-full justify-between font-normal",
            !selected && "text-muted-foreground",
            invalid && "border-destructive",
          )}
        >
          <span className="truncate">{selected?.label ?? placeholder}</span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        side="bottom"
        sideOffset={4}
        avoidCollisions
        className="w-72"
      >
        <DropdownMenuItem
          onSelect={() => {
            setOpen(false);
            onCreate();
          }}
        >
          <Plus className="me-2 h-4 w-4" />
          {createLabel}
        </DropdownMenuItem>
        <div className="relative p-2" onKeyDown={(event) => event.stopPropagation()}>
          <Search className="absolute right-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onClick={(event) => event.stopPropagation()}
            placeholder={searchPlaceholder}
            className="h-8 pr-8 text-xs"
            dir="rtl"
            autoFocus
          />
        </div>
        <DropdownMenuSeparator />
        <div className="max-h-64 overflow-y-auto">
          {filteredOptions.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">{emptyText}</p>
          )}
          {filteredOptions.map((option) => (
            <DropdownMenuItem
              key={option.id}
              className={cn(
                "flex items-center gap-2",
                value === option.id && "bg-accent",
                option.disabled && "text-muted-foreground",
              )}
              onSelect={(event) => {
                if (option.disabled) {
                  event.preventDefault();
                  return;
                }
                onChange(option.id);
              }}
            >
              <span className="min-w-0 flex-1 truncate">{option.label}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                title={`ویرایش ${option.label}`}
                aria-label={`ویرایش ${option.label}`}
                onClick={(event) => {
                  event.stopPropagation();
                  setOpen(false);
                  onEdit(option.id);
                }}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const normalizeCourseName = (name: string) =>
  name.trim().replace(/\s+/g, " ").toLocaleLowerCase("fa");

function CourseNameDialog({
  open,
  onOpenChange,
  title,
  initialName = "",
  courses,
  excludedCourseId,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  initialName?: string;
  courses: Course[];
  excludedCourseId?: string;
  onSave: (name: string) => void;
}) {
  const [name, setName] = useState("");

  useEffect(() => {
    if (open) setName(initialName);
  }, [initialName, open]);

  const normalizedName = normalizeCourseName(name);
  const duplicate = courses.some(
    (course) =>
      course.id !== excludedCourseId && normalizeCourseName(course.name) === normalizedName,
  );
  const valid = Boolean(normalizedName) && !duplicate;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="sm:max-w-sm">
        <DialogHeader className="text-right">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>نام درس را وارد کنید.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!valid) return;
            onSave(name.trim().replace(/\s+/g, " "));
            onOpenChange(false);
          }}
        >
          <div className="space-y-2 py-4">
            <label htmlFor="course-name" className="text-sm font-medium">
              نام درس
            </label>
            <Input
              id="course-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoFocus
              aria-invalid={duplicate}
            />
            {duplicate && <p className="text-xs text-destructive">درسی با این نام وجود دارد.</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              انصراف
            </Button>
            <Button type="submit" disabled={!valid}>
              ذخیره
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
