import { ChevronDown, Download, Expand, Minimize2, Printer, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  fullscreen,
  onModeChange,
  onFiltersChange,
  onResetFilters,
  onClassChange,
  onTeacherChange,
  onFullscreenToggle,
  onPrint,
  onExport,
}: {
  mode: TimetableViewMode;
  filters: SchoolTimetableFilters;
  classes: TimetableClass[];
  teachers: TimetableTeacher[];
  selectedClassId: string;
  selectedTeacherId: string;
  filtersActive: boolean;
  fullscreen: boolean;
  onModeChange: (mode: TimetableViewMode) => void;
  onFiltersChange: (filters: SchoolTimetableFilters) => void;
  onResetFilters: () => void;
  onClassChange: (classId: string) => void;
  onTeacherChange: (teacherId: string) => void;
  onFullscreenToggle: () => void;
  onPrint: () => void;
  onExport: (format: "pdf" | "excel") => void;
}) {
  const grades = [...new Map(classes.map((item) => [item.gradeId, item.gradeLabel])).entries()];
  const majors = [...new Map(classes.map((item) => [item.majorId, item.majorLabel])).entries()];

  return (
    <div
      className="print-hidden space-y-3 border-b bg-background p-3 sm:p-4"
      data-testid="timetable-toolbar"
    >
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <Tabs
          value={mode}
          onValueChange={(value) => onModeChange(value as TimetableViewMode)}
          dir="rtl"
        >
          <TabsList className="grid w-full grid-cols-3 sm:w-auto">
            <TabsTrigger value="school">مدرسه</TabsTrigger>
            <TabsTrigger value="class">کلاس</TabsTrigger>
            <TabsTrigger value="teacher">معلم</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={onFullscreenToggle}>
            {fullscreen ? (
              <Minimize2 className="me-2 h-4 w-4" />
            ) : (
              <Expand className="me-2 h-4 w-4" />
            )}
            {fullscreen ? "خروج از تمام صفحه" : "نمایش تمام صفحه"}
          </Button>
          <Button variant="outline" size="sm" onClick={onPrint}>
            <Printer className="me-2 h-4 w-4" />
            چاپ برنامه
          </Button>
          <DropdownMenu dir="rtl">
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="me-2 h-4 w-4" />
                دانلود
                <ChevronDown className="ms-1 h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              <DropdownMenuLabel>دانلود برنامه</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => onExport("pdf")}>
                PDF <span className="ms-auto text-xs text-muted-foreground">به‌زودی</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onExport("excel")}>
                Excel <span className="ms-auto text-xs text-muted-foreground">به‌زودی</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {mode === "school" && (
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <Select
            value={filters.gradeId}
            onValueChange={(gradeId) => onFiltersChange({ ...filters, gradeId })}
          >
            <SelectTrigger className="w-full md:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه پایه‌ها</SelectItem>
              {grades.map(([id, label]) => (
                <SelectItem key={id} value={id}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.majorId}
            onValueChange={(majorId) => onFiltersChange({ ...filters, majorId })}
          >
            <SelectTrigger className="w-full md:w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه رشته‌ها</SelectItem>
              {majors.map(([id, label]) => (
                <SelectItem key={id} value={id}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <SearchInput
            containerClassName="flex-1 md:max-w-xs"
            value={filters.search}
            onChange={(event) => onFiltersChange({ ...filters, search: event.target.value })}
            placeholder="جستجوی کلاس"
          />
          {filtersActive && (
            <Button variant="ghost" size="sm" onClick={onResetFilters}>
              <RotateCcw className="me-2 h-4 w-4" />
              پاک کردن فیلترها
            </Button>
          )}
        </div>
      )}

      {mode === "class" && (
        <div className="max-w-sm">
          <Select value={selectedClassId} onValueChange={onClassChange}>
            <SelectTrigger>
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
        <div className="max-w-sm">
          <Select value={selectedTeacherId} onValueChange={onTeacherChange}>
            <SelectTrigger>
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
  );
}
