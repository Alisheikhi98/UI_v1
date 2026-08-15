import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Header } from "@/components/header";
import { withAppName } from "@/lib/branding";
import { EntityTimetable } from "@/components/timetable/entity-timetable";
import { SchoolMasterTimetable } from "@/components/timetable/school-master-timetable";
import { TimetableEmptyState } from "@/components/timetable/timetable-empty-state";
import { WeeklyTimetableToolbar } from "@/components/timetable/weekly-timetable-toolbar";
import {
  filterTimetableClasses,
  hasActiveSchoolFilters,
  type SchoolTimetableFilters,
  type TimetableViewMode,
} from "@/lib/timetable";
import { usePublishedTimetable } from "@/lib/timetable-queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/timetable")({
  head: () => ({
    meta: [
      { title: withAppName("برنامه هفتگی") },
      {
        name: "description",
        content: "مشاهده برنامه نهایی مدرسه، کلاس‌ها و معلمان",
      },
    ],
  }),
  component: TimetablePage,
});

const initialFilters: SchoolTimetableFilters = {
  gradeId: "all",
  majorId: "all",
  search: "",
};

function TimetablePage() {
  const timetableQuery = usePublishedTimetable();
  const timetable = timetableQuery.data;
  const [mode, setMode] = useState<TimetableViewMode>("school");
  const [filters, setFilters] = useState(initialFilters);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [fullscreen, setFullscreen] = useState(false);
  const filteredClasses = useMemo(
    () => filterTimetableClasses(timetable?.classes ?? [], filters),
    [filters, timetable?.classes],
  );
  const hasFinalTimetable = (timetable?.entries.length ?? 0) > 0;
  const selectedClass = timetable?.classes.find((item) => item.id === selectedClassId);
  const selectedTeacher = timetable?.teachers.find((item) => item.id === selectedTeacherId);
  const selectedEntityHasLessons = timetable?.entries.some((entry) =>
    mode === "class"
      ? entry.classId === selectedClassId
      : mode === "teacher"
        ? entry.teacherId === selectedTeacherId
        : true,
  );
  const viewLabel =
    mode === "school"
      ? "نمای مدرسه"
      : mode === "class"
        ? `نمای کلاس${selectedClass ? ` — ${selectedClass.name}` : ""}`
        : `نمای معلم${selectedTeacher ? ` — ${selectedTeacher.name}` : ""}`;

  const handlePendingExport = (format: "pdf" | "excel") => {
    toast.info(`خروجی ${format === "pdf" ? "PDF" : "Excel"} هنوز در این نسخه فعال نشده است.`, {
      description: "این منو برای اتصال آینده به خروجی واقعی آماده شده است.",
    });
  };

  return (
    <div className="flex flex-col" dir="rtl">
      {!fullscreen && (
        <Header title="برنامه هفتگی" description="مشاهده برنامه نهایی مدرسه، کلاس‌ها و معلمان" />
      )}

      <main
        className={cn(
          "p-4 sm:p-6",
          fullscreen && "fixed inset-0 z-50 overflow-auto bg-background p-2 sm:p-4",
        )}
      >
        <section
          id="timetable-print-root"
          className="overflow-hidden border bg-background shadow-sm sm:rounded-xl"
          aria-label="برنامه هفتگی نهایی"
        >
          <div className="timetable-print-only mb-4 text-center">
            <h1 className="text-xl font-bold">برنامه هفتگی مدرسه</h1>
            <p>{timetable?.schoolName}</p>
            <p>{viewLabel}</p>
          </div>

          {timetableQuery.isPending ? (
            <p className="p-12 text-center text-sm text-muted-foreground">
              در حال دریافت برنامه هفتگی از سرور...
            </p>
          ) : timetableQuery.isError || !timetable ? (
            <TimetableEmptyState kind="load-error" />
          ) : (
            <>
              <WeeklyTimetableToolbar
                mode={mode}
                filters={filters}
                classes={timetable.classes}
                teachers={timetable.teachers}
                selectedClassId={selectedClassId}
                selectedTeacherId={selectedTeacherId}
                filtersActive={hasActiveSchoolFilters(filters)}
                fullscreen={fullscreen}
                onModeChange={setMode}
                onFiltersChange={setFilters}
                onResetFilters={() => setFilters(initialFilters)}
                onClassChange={setSelectedClassId}
                onTeacherChange={setSelectedTeacherId}
                onFullscreenToggle={() => setFullscreen((value) => !value)}
                onPrint={() => window.print()}
                onExport={handlePendingExport}
              />

              {!hasFinalTimetable ? (
                <TimetableEmptyState kind="no-final" />
              ) : mode === "school" ? (
                filteredClasses.length > 0 ? (
                  <SchoolMasterTimetable timetable={timetable} classes={filteredClasses} />
                ) : (
                  <TimetableEmptyState kind="no-lessons" />
                )
              ) : mode === "class" ? (
                !selectedClassId ? (
                  <TimetableEmptyState kind="no-class" />
                ) : selectedEntityHasLessons ? (
                  <EntityTimetable timetable={timetable} mode="class" entityId={selectedClassId} />
                ) : (
                  <TimetableEmptyState kind="no-lessons" />
                )
              ) : !selectedTeacherId ? (
                <TimetableEmptyState kind="no-teacher" />
              ) : selectedEntityHasLessons ? (
                <EntityTimetable
                  timetable={timetable}
                  mode="teacher"
                  entityId={selectedTeacherId}
                />
              ) : (
                <TimetableEmptyState kind="no-lessons" />
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}
