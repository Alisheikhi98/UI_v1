import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  CalendarDays,
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
import { Checkbox } from "@/components/ui/checkbox";
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
  useTeacherAvailabilityQuery,
  useTeacherAvailabilityMutation,
  useTeachersRepository,
} from "@/lib/mock-queries";
import type { DaySlotGroup, Teacher } from "@/lib/types";
import {
  isWeekdayFullySelected,
  normalizeDaySlotGroups,
  sanitizeAvailabilitySelection,
  TeacherAvailabilitySaveGuard,
  TeacherAvailabilitySaveInProgressError,
  toggleAvailabilitySlot,
  toggleWeekdayAvailability,
} from "@/lib/teacher-availability";
import { useMockApi } from "@/lib/repositories/configured";
import { getWeekdayDisplayLabel } from "@/lib/weekday-labels";

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
  daySlotGroups,
  availableDaySlotIds,
  isLoading,
  loadError,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacher: Teacher | null;
  daySlotGroups: DaySlotGroup[];
  availableDaySlotIds: string[];
  isLoading: boolean;
  loadError: Error | null;
  onSave: (teacherId: string, daySlotIds: string[]) => Promise<void>;
}) {
  const groups = useMemo(() => normalizeDaySlotGroups(daySlotGroups), [daySlotGroups]);
  const [selectedSlotIds, setSelectedSlotIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const saveGuard = useRef(new TeacherAvailabilitySaveGuard());

  useEffect(() => {
    if (!open || isLoading) return;
    setSelectedSlotIds(sanitizeAvailabilitySelection(groups, availableDaySlotIds));
  }, [availableDaySlotIds, groups, isLoading, open, teacher?.id]);

  const handleSave = async () => {
    if (!teacher || isLoading) return;
    try {
      await saveGuard.current.run(async () => {
        setIsSaving(true);
        try {
          await onSave(teacher.id, sanitizeAvailabilitySelection(groups, selectedSlotIds));
          onOpenChange(false);
        } finally {
          setIsSaving(false);
        }
      });
    } catch (error) {
      if (error instanceof TeacherAvailabilitySaveInProgressError) return;
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && isSaving) return;
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="sm:max-w-lg" dir="rtl">
        <DialogHeader className="text-right">
          <DialogTitle>زمان‌های حضور {teacher?.name}</DialogTitle>
          <DialogDescription>
            زنگ‌هایی را مشخص کنید که این معلم در مدرسه در دسترس است. انتخاب زمان اختیاری است.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] space-y-3 overflow-y-auto py-4">
          {isLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              در حال دریافت زنگ‌های مدرسه...
            </p>
          ) : loadError ? (
            <p className="py-8 text-center text-sm text-destructive">{loadError.message}</p>
          ) : groups.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              هنوز زنگی برای این مدرسه ثبت نشده است.
            </p>
          ) : (
            groups.map((group) => {
              const allSelected = isWeekdayFullySelected(selectedSlotIds, group);
              return (
                <section key={group.dayId} className="rounded-lg border p-3">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold">
                      {getWeekdayDisplayLabel(group.dayName)}
                    </h3>
                    {group.slots.length > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={isSaving}
                        onClick={() =>
                          setSelectedSlotIds((current) => toggleWeekdayAvailability(current, group))
                        }
                      >
                        {allSelected ? "پاک‌کردن همه" : "انتخاب همه"}
                      </Button>
                    )}
                  </div>
                  {group.slots.length === 0 ? (
                    <p className="text-xs text-muted-foreground">زنگی برای این روز ثبت نشده است.</p>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {group.slots.map((slot) => {
                        const selected = selectedSlotIds.includes(slot.id);
                        return (
                          <label
                            key={slot.id}
                            className="flex cursor-pointer items-center gap-3 rounded-md border p-3 text-sm hover:bg-muted/50"
                          >
                            <Checkbox
                              checked={selected}
                              disabled={isSaving}
                              onCheckedChange={() =>
                                setSelectedSlotIds((current) =>
                                  toggleAvailabilitySlot(current, slot.id),
                                )
                              }
                            />
                            <span className="font-medium">زنگ {slot.slotNumber}</span>
                            <span className="ms-auto text-xs text-muted-foreground" dir="ltr">
                              {slot.startTime ?? "--:--"} – {slot.endTime ?? "--:--"}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })
          )}
        </div>
        <DialogFooter className="flex-row-reverse justify-start gap-2">
          <Button onClick={handleSave} disabled={isSaving || isLoading || Boolean(loadError)}>
            ذخیره زمان‌های حضور
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            انصراف
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TeachersPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const teacherActiveFilter =
    statusFilter === "active" ? true : statusFilter === "inactive" ? false : "all";
  const {
    items: teachers,
    create,
    update,
    remove,
  } = useTeachersRepository({
    filters: { active: teacherActiveFilter },
  });
  const { items: schoolCourses } = useCoursesRepository();
  const daySlotsQuery = useDaySlotsRepository();
  const availabilityMutation = useTeacherAvailabilityMutation();
  const subjectById = new Map(schoolCourses.map((subject) => [subject.id, subject]));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [availabilityDialogOpen, setAvailabilityDialogOpen] = useState(false);
  const [availabilityTeacher, setAvailabilityTeacher] = useState<Teacher | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [teacherToDelete, setTeacherToDelete] = useState<Teacher | null>(null);
  const availabilityQuery = useTeacherAvailabilityQuery(availabilityTeacher?.id ?? null);

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
      toast.success("زمان‌های حضور به‌روز شد");
    } catch (error) {
      toast.error("ذخیره زمان‌های حضور انجام نشد", {
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
                                <span className="text-xs text-muted-foreground">
                                  {useMockApi ? "بدون درس" : "—"}
                                </span>
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
                              className="text-primary"
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
        daySlotGroups={daySlotsQuery.data ?? []}
        availableDaySlotIds={availabilityQuery.data ?? []}
        isLoading={daySlotsQuery.isLoading || availabilityQuery.isLoading}
        loadError={
          daySlotsQuery.error instanceof Error
            ? daySlotsQuery.error
            : availabilityQuery.error instanceof Error
              ? availabilityQuery.error
              : null
        }
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
