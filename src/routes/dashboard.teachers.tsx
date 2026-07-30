import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  CalendarDays,
  Check,
  Edit,
  Filter,
  GraduationCap,
  MoreHorizontal,
  Phone,
  Plus,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/header";
import {
  TeacherDetailsDialog,
  type TeacherDetailsInput,
} from "@/components/teachers/teacher-details-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  useCoursesRepository,
  useDaySlotsRepository,
  useTeacherAvailabilityMutation,
  useTeachersRepository,
} from "@/lib/mock-queries";
import type { DaySlot, Teacher, Weekday } from "@/lib/types";

const WEEKDAY_OPTIONS: ReadonlyArray<{ value: Weekday; label: string }> = [
  { value: "saturday", label: "شنبه" },
  { value: "sunday", label: "یکشنبه" },
  { value: "monday", label: "دوشنبه" },
  { value: "tuesday", label: "سه‌شنبه" },
  { value: "wednesday", label: "چهارشنبه" },
  { value: "thursday", label: "پنجشنبه" },
];

export const Route = createFileRoute("/dashboard/teachers")({
  head: () => ({
    meta: [
      { title: "معلمان - آموزش‌یار" },
      { name: "description", content: "مدیریت معلمان مدرسه" },
    ],
  }),
  component: TeachersPage,
});

function EmptyState({ onAddTeacher }: { onAddTeacher: () => void }) {
  return (
    <Card className="flex flex-col items-center justify-center p-12 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <Users className="h-8 w-8 text-primary" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">هنوز معلمی ثبت نشده</h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        با افزودن اولین معلم، اطلاعات کادر آموزشی مدرسه را ثبت کنید.
      </p>
      <Button className="mt-6" onClick={onAddTeacher}>
        <Plus className="ml-2 h-4 w-4" />
        افزودن معلم
      </Button>
    </Card>
  );
}

function TeacherAvailabilityDialog({
  open,
  onOpenChange,
  teacher,
  daySlots,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacher: Teacher | null;
  daySlots: DaySlot[];
  onSave: (teacherId: string, daySlotIds: string[]) => Promise<void>;
}) {
  const [selectedDays, setSelectedDays] = useState<Weekday[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const availableIds = new Set(teacher?.availableDaySlotIds ?? []);
    setSelectedDays(
      WEEKDAY_OPTIONS.filter((_, index) =>
        daySlots.some((slot) => slot.dayId === index + 1 && availableIds.has(slot.id)),
      ).map((day) => day.value),
    );
  }, [daySlots, open, teacher]);

  const toggleDay = (day: Weekday) => {
    setSelectedDays((current) =>
      current.includes(day)
        ? current.filter((selectedDay) => selectedDay !== day)
        : [...current, day],
    );
  };

  const handleSave = async () => {
    if (!teacher) return;
    const selectedDayIds = new Set(
      WEEKDAY_OPTIONS.flatMap((day, index) =>
        selectedDays.includes(day.value) ? [index + 1] : [],
      ),
    );
    setIsSaving(true);
    try {
      await onSave(
        teacher.id,
        daySlots.filter((slot) => selectedDayIds.has(slot.dayId)).map((slot) => slot.id),
      );
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" dir="rtl">
        <DialogHeader className="text-right">
          <DialogTitle>روزهای حضور {teacher?.name}</DialogTitle>
          <DialogDescription>
            روزهایی را مشخص کنید که این معلم در مدرسه در دسترس است. انتخاب روز اختیاری است.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2 py-4 sm:grid-cols-3">
          {WEEKDAY_OPTIONS.map((day) => {
            const selected = selectedDays.includes(day.value);
            return (
              <Button
                key={day.value}
                type="button"
                variant={selected ? "secondary" : "outline"}
                aria-pressed={selected}
                onClick={() => toggleDay(day.value)}
                className="justify-start gap-2"
              >
                <span
                  className={`flex h-4 w-4 items-center justify-center rounded border ${
                    selected ? "border-primary bg-primary text-primary-foreground" : ""
                  }`}
                >
                  {selected && <Check className="h-3 w-3" />}
                </span>
                {day.label}
              </Button>
            );
          })}
        </div>
        <DialogFooter className="flex-row-reverse justify-start gap-2">
          <Button onClick={handleSave} disabled={isSaving}>
            ذخیره روزهای حضور
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            انصراف
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TeachersPage() {
  const { items: teachers, relatedCourses, create, update, remove } = useTeachersRepository();
  const { items: schoolCourses } = useCoursesRepository();
  const { data: daySlots = [] } = useDaySlotsRepository();
  const availabilityMutation = useTeacherAvailabilityMutation();
  const subjectById = new Map(
    [...schoolCourses, ...relatedCourses].map((subject) => [subject.id, subject]),
  );
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [availabilityDialogOpen, setAvailabilityDialogOpen] = useState(false);
  const [availabilityTeacher, setAvailabilityTeacher] = useState<Teacher | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [teacherToDelete, setTeacherToDelete] = useState<Teacher | null>(null);

  const normalizedSearch = search.trim().toLocaleLowerCase("fa");
  const filteredTeachers = teachers.filter((teacher) => {
    const matchesSearch =
      teacher.name.toLocaleLowerCase("fa").includes(normalizedSearch) ||
      (teacher.personnel_code || "").toLocaleLowerCase("fa").includes(normalizedSearch);
    const matchesStatus = statusFilter === "all" || teacher.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleSave = async (data: TeacherDetailsInput) => {
    try {
      if (editingTeacher) {
        await update({ id: editingTeacher.id, input: data });
        toast.success("اطلاعات معلم به‌روز شد", {
          description: `${data.name} با موفقیت ویرایش شد.`,
        });
      } else {
        const newTeacher = await create({
          name: data.name,
          personnel_code: data.personnel_code || "",
          phone: data.phone || "",
        });
        toast.success("معلم جدید اضافه شد", {
          description: `${newTeacher.name} با موفقیت به فهرست معلمان اضافه شد.`,
        });
      }
      setEditingTeacher(null);
    } catch (error) {
      toast.error("ذخیره اطلاعات معلم انجام نشد", {
        description: error instanceof Error ? error.message : undefined,
      });
      throw error;
    }
  };

  const saveAvailability = async (teacherId: string, daySlotIds: string[]) => {
    try {
      await availabilityMutation.mutateAsync({ teacherId, daySlotIds });
      toast.success("روزهای حضور به‌روز شد");
      setAvailabilityTeacher(null);
    } catch (error) {
      toast.error("ذخیره روزهای حضور انجام نشد", {
        description: error instanceof Error ? error.message : undefined,
      });
      throw error;
    }
  };

  const openAddDialog = () => {
    setEditingTeacher(null);
    setDialogOpen(true);
  };

  const openEditDialog = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setDialogOpen(true);
  };

  const openAvailabilityDialog = (teacher: Teacher) => {
    setAvailabilityTeacher(teacher);
    setAvailabilityDialogOpen(true);
  };

  const openDeleteDialog = (teacher: Teacher) => {
    setTeacherToDelete(teacher);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!teacherToDelete) return;
    try {
      await remove(teacherToDelete.id);
      toast.success("معلم با موفقیت حذف شد", {
        description: `${teacherToDelete.name} از فهرست معلمان حذف شد.`,
      });
      setTeacherToDelete(null);
      setDeleteDialogOpen(false);
    } catch (error) {
      toast.error("حذف معلم انجام نشد", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  return (
    <div className="flex flex-col" dir="rtl">
      <Header title="معلمان" description="مدیریت اطلاعات و روزهای حضور کادر آموزشی" />
      <div className="space-y-6 p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative max-w-md flex-1">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="جستجوی نام یا کد پرسنلی..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pr-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-36">
                <Filter className="ml-2 h-4 w-4" />
                <SelectValue placeholder="وضعیت" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه</SelectItem>
                <SelectItem value="active">فعال</SelectItem>
                <SelectItem value="inactive">غیرفعال</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={openAddDialog}>
            <Plus className="ml-2 h-4 w-4" />
            افزودن معلم
          </Button>
        </div>

        {filteredTeachers.length === 0 && !search && statusFilter === "all" ? (
          <EmptyState onAddTeacher={openAddDialog} />
        ) : (
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table className="min-w-[960px] text-center">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-14 text-center">ردیف</TableHead>
                      <TableHead className="w-px whitespace-nowrap text-center">معلم</TableHead>
                      <TableHead className="text-center">شماره تماس</TableHead>
                      <TableHead className="text-center">دروس</TableHead>
                      <TableHead className="text-center">روزهای حضور</TableHead>
                      <TableHead className="text-center">وضعیت</TableHead>
                      <TableHead className="w-20 text-center">عملیات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTeachers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                          معلمی با این مشخصات یافت نشد.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTeachers.map((teacher, index) => (
                        <TableRow key={teacher.id}>
                          <TableCell className="text-center font-medium text-muted-foreground">
                            {index + 1}
                          </TableCell>
                          <TableCell className="w-px whitespace-nowrap">
                            <div className="flex items-center justify-center gap-2">
                              <GraduationCap className="h-4 w-4 shrink-0 text-muted-foreground" />
                              <span className="font-medium text-foreground">{teacher.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {teacher.phone ? (
                              <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
                                <Phone className="h-3.5 w-3.5" />
                                <span dir="ltr">{teacher.phone}</span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">ثبت نشده</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="mx-auto flex max-w-64 flex-wrap justify-center gap-1">
                              {teacher.courseIds.length > 0 ? (
                                teacher.courseIds.map((subjectId) => {
                                  const subject = subjectById.get(subjectId);
                                  return subject ? (
                                    <Badge key={subjectId} variant="secondary" className="text-xs">
                                      {subject.name}
                                    </Badge>
                                  ) : null;
                                })
                              ) : (
                                <span className="text-xs text-muted-foreground">بدون درس</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openAvailabilityDialog(teacher)}
                              aria-label={`ویرایش روزهای حضور ${teacher.name}`}
                              title="ویرایش روزهای حضور"
                              className={
                                teacher.availableDaySlotIds.length === 0
                                  ? "text-amber-600 dark:text-amber-400"
                                  : "text-primary"
                              }
                            >
                              <CalendarDays className="h-5 w-5" />
                            </Button>
                          </TableCell>
                          <TableCell>
                            <Badge variant={teacher.status === "active" ? "default" : "secondary"}>
                              {teacher.status === "active" ? "فعال" : "غیرفعال"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label={`عملیات ${teacher.name}`}
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="text-right">
                                <DropdownMenuItem onClick={() => openEditDialog(teacher)}>
                                  <Edit className="ml-2 h-4 w-4" />
                                  ویرایش
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => openDeleteDialog(teacher)}
                                >
                                  <Trash2 className="ml-2 h-4 w-4" />
                                  حذف
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <TeacherDetailsDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        teacher={editingTeacher}
        onSave={handleSave}
      />
      <TeacherAvailabilityDialog
        open={availabilityDialogOpen}
        onOpenChange={(open) => {
          setAvailabilityDialogOpen(open);
          if (!open) setAvailabilityTeacher(null);
        }}
        teacher={availabilityTeacher}
        daySlots={daySlots}
        onSave={saveAvailability}
      />
      <Dialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) setTeacherToDelete(null);
        }}
      >
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle>تأیید حذف معلم</DialogTitle>
            <DialogDescription>
              آیا مطمئن هستید که می‌خواهید{" "}
              <span className="font-medium text-foreground">{teacherToDelete?.name}</span> را حذف
              کنید؟ این عملیات قابل بازگشت نیست.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row-reverse justify-start gap-2">
            <Button variant="destructive" onClick={confirmDelete}>
              حذف معلم
            </Button>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              انصراف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
