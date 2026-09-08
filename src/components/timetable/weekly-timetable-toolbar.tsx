import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SearchInput } from "@/components/ui/search-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  SchoolTimetableFilters,
  TimetableClass,
  TimetableTeacher,
  TimetableViewMode,
} from "@/lib/timetable";

export function WeeklyTimetableToolbar({
  mode,
  filters,
  classes,
  teachers,
  selectedClassId,
  selectedTeacherId,
  filtersActive,
  onModeChange,
  onFiltersChange,
  onResetFilters,
  onClassChange,
  onTeacherChange,
}: {
  mode: TimetableViewMode;
  filters: SchoolTimetableFilters;
  classes: TimetableClass[];
  teachers: TimetableTeacher[];
  selectedClassId: string;
  selectedTeacherId: string;
  filtersActive: boolean;
  onModeChange: (mode: TimetableViewMode) => void;
  onFiltersChange: (filters: SchoolTimetableFilters) => void;
  onResetFilters: () => void;
  onClassChange: (classId: string) => void;
  onTeacherChange: (teacherId: string) => void;
}) {
  const grades = [...new Map(classes.map((item) => [item.gradeId, item.gradeLabel])).entries()];
  const majors = [...new Map(classes.map((item) => [item.majorId, item.majorLabel])).entries()];

  return (
    <div
      className="timetable-toolbar print-hidden border-b bg-background p-3 sm:p-4"
      data-testid="timetable-toolbar"
    >
      <div className="timetable-toolbar-primary flex flex-col gap-3 xl:flex-row xl:items-center">
        <Tabs
          className="timetable-view-tabs shrink-0"
          value={mode}
          onValueChange={(value) => onModeChange(value as TimetableViewMode)}
          dir="rtl"
          aria-label="نوع نمایش برنامه هفتگی"
        >
          <TabsList className="grid h-10 w-full grid-cols-3 bg-muted/80 p-1 sm:w-64">
            <TabsTrigger className="h-8" value="school">
              مدرسه
            </TabsTrigger>
            <TabsTrigger className="h-8" value="class">
              کلاس
            </TabsTrigger>
            <TabsTrigger className="h-8" value="teacher">
              معلم
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="timetable-context-controls min-w-0 xl:flex-1">
          {mode === "school" && (
            <div className="timetable-toolbar-filters grid gap-2 sm:grid-cols-2 md:grid-cols-[minmax(10rem,11rem)_minmax(12rem,13rem)_minmax(10rem,12rem)_auto] md:items-center">
              <div className="flex min-w-0 items-center gap-1.5">
                <Label
                  htmlFor="timetable-grade-filter"
                  className="shrink-0 text-xs text-muted-foreground"
                >
                  پایه
                </Label>
                <Select
                  value={filters.gradeId}
                  onValueChange={(gradeId) => onFiltersChange({ ...filters, gradeId })}
                >
                  <SelectTrigger id="timetable-grade-filter" className="h-9 min-w-0 flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">همه</SelectItem>
                    {grades.map(([id, label]) => (
                      <SelectItem key={id} value={id}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex min-w-0 items-center gap-1.5">
                <Label
                  htmlFor="timetable-major-filter"
                  className="shrink-0 text-xs text-muted-foreground"
                >
                  رشته
                </Label>
                <Select
                  value={filters.majorId}
                  onValueChange={(majorId) => onFiltersChange({ ...filters, majorId })}
                >
                  <SelectTrigger id="timetable-major-filter" className="h-9 min-w-0 flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">همه</SelectItem>
                    {majors.map(([id, label]) => (
                      <SelectItem key={id} value={id}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="min-w-0 sm:col-span-2 md:col-span-1">
                <Label htmlFor="timetable-class-search" className="sr-only">
                  جستجوی کلاس
                </Label>
                <SearchInput
                  id="timetable-class-search"
                  containerClassName="w-full"
                  className="h-9"
                  value={filters.search}
                  onChange={(event) => onFiltersChange({ ...filters, search: event.target.value })}
                  placeholder="جستجوی کلاس"
                />
              </div>

              {filtersActive && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-self-start whitespace-nowrap sm:col-span-2 md:col-span-1"
                  onClick={onResetFilters}
                >
                  <RotateCcw className="me-2 h-4 w-4" />
                  پاک کردن فیلترها
                </Button>
              )}
            </div>
          )}

          {mode === "class" && (
            <div className="flex max-w-md items-center gap-2">
              <Label htmlFor="timetable-class-select" className="shrink-0 text-sm">
                کلاس:
              </Label>
              <Select value={selectedClassId} onValueChange={onClassChange}>
                <SelectTrigger id="timetable-class-select" className="h-9 min-w-0 flex-1">
                  <SelectValue placeholder="انتخاب کلاس" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {mode === "teacher" && (
            <div className="flex max-w-md items-center gap-2">
              <Label htmlFor="timetable-teacher-select" className="shrink-0 text-sm">
                معلم:
              </Label>
              <Select value={selectedTeacherId} onValueChange={onTeacherChange}>
                <SelectTrigger id="timetable-teacher-select" className="h-9 min-w-0 flex-1">
                  <SelectValue placeholder="انتخاب معلم" />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
