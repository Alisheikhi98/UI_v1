import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Header } from "@/components/header";
import { ClassAssignmentsSheet } from "@/components/classes/class-assignments-sheet";
import {
  isAssignmentComplete,
  type ClassAssignment,
  type CourseOption,
  type TeacherOption,
} from "@/lib/class-configuration";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { mockClasses, mockSubjects, mockTeachers } from "@/lib/data";
import {
  Plus,
  Search,
  Trash2,
  GraduationCap,
  CalendarClock,
  Check,
  Filter,
  UserRoundCheck,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/classes")({
  head: () => ({
    meta: [
      { title: "کلاس‌ها - آموزش‌یار" },
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

interface ClassViewModel {
  id: string;
  name: string;
  grade: string;
  major: string;
  gradeId: string;
  gradeName: string;
  majorId: string;
  majorName: string;
  studentCapacity: number;
}

type ClassFormData = Pick<ClassViewModel, "name" | "grade" | "major">;

const MAJOR_OPTIONS = ["ریاضی فیزیک", "علوم تجربی", "ادبیات و علوم انسانی"] as const;
const GRADE_OPTIONS = [
  { value: "10", label: "پایه دهم" },
  { value: "11", label: "پایه یازدهم" },
  { value: "12", label: "پایه دوازدهم" },
] as const;

const emptyClassForm = (): ClassFormData => ({ name: "", grade: "", major: "" });

function ClassDialog({
  open,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: ClassFormData) => void;
}) {
  const [formData, setFormData] = useState<ClassFormData>(emptyClassForm);

  useEffect(() => {
    if (!open) return;
    setFormData(emptyClassForm());
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="مثلاً کلاس دهم الف"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>پایه</Label>
              <Select
                value={formData.grade}
                onValueChange={(grade) => setFormData({ ...formData, grade })}
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
            </div>
            <div className="space-y-2">
              <Label>رشته تحصیلی</Label>
              <Select
                value={formData.major}
                onValueChange={(major) => setFormData({ ...formData, major })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="انتخاب رشته" />
                </SelectTrigger>
                <SelectContent>
                  {MAJOR_OPTIONS.map((major) => (
                    <SelectItem key={major} value={major}>
                      {major}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              انصراف
            </Button>
            <Button type="submit">افزودن کلاس</Button>
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
  onSave: (name: string) => void;
}) {
  const [name, setName] = useState("");

  useEffect(() => {
    if (open) setName(classItem?.name ?? "");
  }, [classItem, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="sm:max-w-sm">
        <DialogHeader className="text-right">
          <DialogTitle>ویرایش نام کلاس</DialogTitle>
          <DialogDescription>پایه و رشته کلاس پس از ایجاد قابل تغییر نیستند.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (name.trim()) onSave(name.trim());
          }}
        >
          <div className="space-y-2 py-4">
            <Label htmlFor="rename-class">نام کلاس</Label>
            <Input
              id="rename-class"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              انصراف
            </Button>
            <Button type="submit" disabled={!name.trim() || name.trim() === classItem?.name}>
              ذخیره نام
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ClassesPage() {
  const navigate = useNavigate();
  const [classes, setClasses] = useState<ClassViewModel[]>(() =>
    mockClasses.map(({ id, name, grade, studentCount }, index) => ({
      id,
      name,
      grade,
      major: MAJOR_OPTIONS[index % MAJOR_OPTIONS.length],
      gradeId: grade,
      gradeName: GRADE_OPTIONS.find((item) => item.value === grade)?.label ?? `پایه ${grade}`,
      majorId: `major-${(index % MAJOR_OPTIONS.length) + 1}`,
      majorName: MAJOR_OPTIONS[index % MAJOR_OPTIONS.length],
      studentCapacity: studentCount,
    })),
  );
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [majorFilter, setMajorFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [renamingClass, setRenamingClass] = useState<ClassViewModel | null>(null);
  const [assignmentClass, setAssignmentClass] = useState<ClassViewModel | null>(null);
  const [classToDelete, setClassToDelete] = useState<ClassViewModel | null>(null);
  const [courses, setCourses] = useState<CourseOption[]>(() =>
    mockSubjects.map((subject, index) => ({
      id: subject.id,
      name: subject.name,
      code: subject.code,
      grade: GRADE_OPTIONS[index % GRADE_OPTIONS.length].value,
      major: MAJOR_OPTIONS[index % MAJOR_OPTIONS.length],
      category: index < 2 ? "general" : "specialized",
      active: true,
      gradeId: GRADE_OPTIONS[index % GRADE_OPTIONS.length].value,
      gradeName: GRADE_OPTIONS[index % GRADE_OPTIONS.length].label,
      majorId: `major-${(index % MAJOR_OPTIONS.length) + 1}`,
      majorName: MAJOR_OPTIONS[index % MAJOR_OPTIONS.length],
    })),
  );
  const [teachers, setTeachers] = useState<TeacherOption[]>(() =>
    mockTeachers.map((teacher, index) => ({
      id: teacher.id,
      name: teacher.name,
      code: teacher.id,
      phone: teacher.phone,
      active: teacher.status === "active",
      availableDays: index < 2 ? ["saturday", "sunday", "monday", "tuesday", "wednesday"] : [],
    })),
  );
  const [assignments, setAssignments] = useState<ClassAssignment[]>([
    {
      id: "assignment-1",
      classId: "1",
      courseId: "1",
      teacherId: "1",
      slotsPerWeek: 6,
    },
    {
      id: "assignment-2",
      classId: "1",
      courseId: "3",
      teacherId: "1",
      slotsPerWeek: 4,
    },
    {
      id: "assignment-3",
      classId: "2",
      courseId: "2",
      teacherId: "2",
      slotsPerWeek: 5,
    },
  ]);

  const filteredClasses = classes.filter((c) => {
    const normalizedSearch = search.toLowerCase();
    const matchesSearch =
      c.name.toLowerCase().includes(normalizedSearch) ||
      c.major.toLowerCase().includes(normalizedSearch);
    const matchesGrade = gradeFilter === "all" || c.grade === gradeFilter;
    const matchesMajor = majorFilter === "all" || c.major === majorFilter;
    return matchesSearch && matchesGrade && matchesMajor;
  });

  const activeFilterCount = Number(gradeFilter !== "all") + Number(majorFilter !== "all");

  const handleSave = (data: ClassFormData) => {
    const newClass: ClassViewModel = {
      id: crypto.randomUUID(),
      ...data,
      gradeId: data.grade,
      gradeName: GRADE_OPTIONS.find((item) => item.value === data.grade)?.label ?? data.grade,
      majorId: `major-${MAJOR_OPTIONS.indexOf(data.major as (typeof MAJOR_OPTIONS)[number]) + 1}`,
      majorName: data.major,
      studentCapacity: 0,
    };
    setClasses((current) => [...current, newClass]);
    toast.success("کلاس با موفقیت اضافه شد");
  };

  const handleDelete = (classItem: ClassViewModel) => {
    setClasses(classes.filter((c) => c.id !== classItem.id));
    setAssignments((current) =>
      current.filter((assignment) => assignment.classId !== classItem.id),
    );
    toast.success("کلاس با موفقیت حذف شد");
  };

  const openAddDialog = () => setDialogOpen(true);
  const renameClass = (name: string) => {
    if (!renamingClass) return;
    setClasses((current) =>
      current.map((item) => (item.id === renamingClass.id ? { ...item, name } : item)),
    );
    setRenamingClass(null);
    toast.success("نام کلاس به‌روز شد");
  };
  const assignmentCount = (classId: string) =>
    assignments.filter((assignment) => assignment.classId === classId).length;
  const incompleteCourseCount = (classId: string) =>
    assignments.filter((assignment) => {
      if (assignment.classId !== classId) return false;
      return !isAssignmentComplete(assignment, teachers);
    }).length;

  return (
    <div className="flex flex-col">
      <Header title="کلاس‌ها" description="مدیریت کلاس‌ها و بخش‌های مدرسه" />
      <div className="p-6 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full flex-1 sm:max-w-sm">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="جستجوی کلاس‌ها..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-9"
              />
            </div>
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
                    {(["all", ...MAJOR_OPTIONS] as const).map((major) => (
                      <Button
                        key={major}
                        type="button"
                        variant="ghost"
                        className="h-8 justify-between px-2 font-normal"
                        onClick={() => setMajorFilter(major)}
                      >
                        <span>{major === "all" ? "همه رشته‌ها" : major}</span>
                        {majorFilter === major && <Check className="h-4 w-4 text-primary" />}
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

        {filteredClasses.length === 0 &&
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
                        <TableHead className="w-28 text-center">مشاهده برنامه</TableHead>
                        <TableHead className="w-20 text-center">حذف</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredClasses.map((classItem, index) => {
                        const hasAssignments = assignmentCount(classItem.id) > 0;
                        const incompleteCourses = incompleteCourseCount(classItem.id);
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
                                {incompleteCourses > 0 && (
                                  <span className="ms-2 text-xs text-destructive">
                                    {incompleteCourses.toLocaleString("fa-IR")} درس ناقص
                                  </span>
                                )}
                              </Button>
                            </TableCell>
                            <TableCell className="text-center">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    aria-label="مشاهده برنامه"
                                    onClick={() => navigate({ to: "/dashboard/timetable" })}
                                  >
                                    <CalendarClock className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>مشاهده برنامه</TooltipContent>
                              </Tooltip>
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
                  const incompleteCourses = incompleteCourseCount(classItem.id);
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
                                  پایه {classItem.grade}
                                </span>
                                <span className="rounded-md bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                                  رشته: {classItem.major}
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
                            {incompleteCourses > 0 &&
                              ` • ${incompleteCourses.toLocaleString("fa-IR")} درس ناقص`}
                          </Button>
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => navigate({ to: "/dashboard/timetable" })}
                            >
                              <CalendarClock className="me-2 h-4 w-4" /> مشاهده برنامه
                            </Button>
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

      <ClassDialog open={dialogOpen} onOpenChange={setDialogOpen} onSave={handleSave} />

      <RenameClassDialog
        open={Boolean(renamingClass)}
        onOpenChange={(open) => !open && setRenamingClass(null)}
        classItem={renamingClass}
        onSave={renameClass}
      />

      <AlertDialog
        open={Boolean(classToDelete)}
        onOpenChange={(open) => !open && setClassToDelete(null)}
      >
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader className="text-right">
            <AlertDialogTitle>حذف کلاس {classToDelete?.name}</AlertDialogTitle>
            <AlertDialogDescription>
              با حذف کلاس «{classToDelete?.name}»، اطلاعات انتخاب معلمان این کلاس نیز حذف می‌شود.{" "}
              معلمان و درس‌های مشترک حذف نخواهند شد.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (classToDelete) handleDelete(classToDelete);
                setClassToDelete(null);
              }}
            >
              حذف کلاس
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ClassAssignmentsSheet
        open={Boolean(assignmentClass)}
        onOpenChange={(open) => !open && setAssignmentClass(null)}
        classItem={assignmentClass}
        assignments={assignments}
        courses={courses}
        teachers={teachers}
        onSaveAssignment={(assignment) => {
          setAssignments((current) => {
            const exists = current.some((item) => item.id === assignment.id);
            return exists
              ? current.map((item) => (item.id === assignment.id ? assignment : item))
              : [...current, assignment];
          });
        }}
        onDeleteAssignment={(id) =>
          setAssignments((current) => current.filter((item) => item.id !== id))
        }
        onCreateCourse={(course) => setCourses((current) => [...current, course])}
        onUpdateCourse={(updatedCourse) =>
          setCourses((current) =>
            current.map((course) => (course.id === updatedCourse.id ? updatedCourse : course)),
          )
        }
        onCreateTeacher={(teacher) => setTeachers((current) => [...current, teacher])}
        onUpdateTeacher={(updatedTeacher) =>
          setTeachers((current) =>
            current.map((teacher) => (teacher.id === updatedTeacher.id ? updatedTeacher : teacher)),
          )
        }
        onUpdateTeacherAvailability={(teacherId, availableDays) =>
          setTeachers((current) =>
            current.map((teacher) =>
              teacher.id === teacherId ? { ...teacher, availableDays } : teacher,
            ),
          )
        }
      />
    </div>
  );
}
