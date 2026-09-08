import { useCallback, useMemo, useRef, useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { History } from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/header";
import { withAppName } from "@/lib/branding";
import { Button } from "@/components/ui/button";
import { EntityTimetable } from "@/components/timetable/entity-timetable";
import { FullscreenTimetableOverview } from "@/components/timetable/fullscreen-timetable-overview";
import { SchoolMasterTimetable } from "@/components/timetable/school-master-timetable";
import { TimetableEmptyState } from "@/components/timetable/timetable-empty-state";
import { TimetableHistorySheet } from "@/components/timetable/timetable-history-sheet";
import { TimetablePageActions } from "@/components/timetable/timetable-page-actions";
import { TimetableSummary } from "@/components/timetable/timetable-summary";
import { TimetableViewHeader } from "@/components/timetable/timetable-view-header";
import { WeeklyTimetableToolbar } from "@/components/timetable/weekly-timetable-toolbar";
import { useActiveSchoolId } from "@/lib/active-school";
import { downloadWeeklyPlanExcel, getWeeklyPlanExcelErrorMessage } from "@/lib/api/timetable-excel";
import {
  filterTimetableClasses,
  hasActiveSchoolFilters,
  parseTimetableRouteSearch,
  type SchoolTimetableFilters,
  type TimetableViewMode,
} from "@/lib/timetable";
import {
  createTimetableExportModel,
  getTimetablePdfErrorMessage,
  printTimetablePdf,
} from "@/lib/timetable-export";
import { usePublishedTimetable } from "@/lib/timetable-queries";

export const Route = createFileRoute("/dashboard/timetable")({
  validateSearch: parseTimetableRouteSearch,
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
  errorComponent: TimetableRouteError,
});

const initialFilters: SchoolTimetableFilters = {
  gradeId: "all",
  majorId: "all",
  search: "",
};

function TimetableRouteError({ reset }: { reset: () => void }) {
  const router = useRouter();

  return (
    <div className="weekly-timetable-page flex flex-col" dir="rtl">
      <Header title="برنامه هفتگی" description="برنامه نهایی و ثبت‌شده مدرسه" />
      <main className="timetable-page-main p-4 sm:p-6">
        <section className="overflow-hidden border bg-background shadow-sm sm:rounded-xl">
          <TimetableEmptyState kind="no-final" />
          <div className="pb-6 text-center">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                void router.invalidate().then(reset);
              }}
            >
              تلاش دوباره
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}

function TimetablePage() {
  const schoolId = useActiveSchoolId();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const timetableQuery = usePublishedTimetable();
  const timetable = timetableQuery.data;
  const mode = search.mode ?? "school";
  const selectedClassId = search.classId ?? "";
  const selectedTeacherId = search.teacherId ?? "";
  const [filters, setFilters] = useState(initialFilters);
  const [fullscreen, setFullscreen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [exportPending, setExportPending] = useState<"pdf" | "excel" | null>(null);
  const exportInFlight = useRef(false);
  const closeFullscreen = useCallback(() => setFullscreen(false), []);
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
  const exportModel = useMemo(() => {
    if (!timetable || !hasFinalTimetable) return null;
    return createTimetableExportModel({
      timetable,
      mode,
      visibleClasses: filteredClasses,
      selectedClassId,
      selectedTeacherId,
    });
  }, [filteredClasses, hasFinalTimetable, mode, selectedClassId, selectedTeacherId, timetable]);
  const pdfExportDisabled = !schoolId || !exportModel || timetableQuery.isPending;
  const excelExportDisabled =
    timetableQuery.isPending ||
    !hasFinalTimetable ||
    !schoolId ||
    (mode === "class" && !selectedClassId) ||
    (mode === "teacher" && !selectedTeacherId);

  const setMode = (nextMode: TimetableViewMode) => {
    void navigate({
      search: (previous) => ({
        ...previous,
        mode: nextMode === "school" ? undefined : nextMode,
      }),
    });
  };

  const setSelectedClassId = (classId: string) => {
    void navigate({
      search: (previous) => ({ ...previous, mode: "class", classId: classId || undefined }),
    });
  };

  const setSelectedTeacherId = (teacherId: string) => {
    void navigate({
      search: (previous) => ({
        ...previous,
        mode: "teacher",
        teacherId: teacherId || undefined,
      }),
    });
  };

  const handleExport = async (format: "pdf" | "excel") => {
    if (exportPending || exportInFlight.current) return;
    if (format === "pdf" && pdfExportDisabled) return;
    if (format === "excel" && excelExportDisabled) return;
    exportInFlight.current = true;
    setExportPending(format);
    try {
      if (format === "excel") {
        if (!schoolId) return;
        await downloadWeeklyPlanExcel({
          mode,
          schoolId,
          classId: selectedClassId,
          teacherId: selectedTeacherId,
        });
      } else {
        if (!exportModel) return;
        await printTimetablePdf(exportModel);
      }
    } catch (error) {
      toast.error(
        format === "excel"
          ? getWeeklyPlanExcelErrorMessage(error)
          : getTimetablePdfErrorMessage(error),
      );
    } finally {
      exportInFlight.current = false;
      setExportPending(null);
    }
  };

  return (
    <div
      className="weekly-timetable-page flex flex-col"
      dir="rtl"
      aria-hidden={fullscreen || undefined}
      inert={fullscreen || undefined}
    >
      <Header title="برنامه هفتگی" description="برنامه نهایی و ثبت‌شده مدرسه" />

      <main className="timetable-page-main p-4 sm:p-6">
        <div className="mb-3 flex flex-col gap-2 print:hidden sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          <Button type="button" variant="outline" onClick={() => setHistoryOpen(true)}>
            <History className="h-4 w-4" />
            تاریخچه برنامه‌ها
          </Button>
          {!timetableQuery.isPending && !timetableQuery.isError && timetable && (
            <TimetablePageActions
              fullscreen={false}
              onFullscreenToggle={() => setFullscreen((value) => !value)}
              onPrint={() => window.print()}
              onExport={(format) => void handleExport(format)}
              pdfExportDisabled={pdfExportDisabled}
              excelExportDisabled={excelExportDisabled}
              exportPending={exportPending}
            />
          )}
        </div>
        <section
          id="timetable-print-root"
          className="isolate overflow-hidden border bg-background shadow-sm sm:rounded-xl"
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
                onModeChange={setMode}
                onFiltersChange={setFilters}
                onResetFilters={() => setFilters(initialFilters)}
                onClassChange={setSelectedClassId}
                onTeacherChange={setSelectedTeacherId}
              />

              {hasFinalTimetable && (
                <>
                  <TimetableViewHeader
                    mode={mode}
                    schoolName={timetable.schoolName}
                    selectedClassName={selectedClass?.name}
                    selectedTeacherName={selectedTeacher?.name}
                  >
                    {mode === "school" && filteredClasses.length > 0 ? (
                      <TimetableSummary timetable={timetable} classes={filteredClasses} />
                    ) : null}
                  </TimetableViewHeader>
                </>
              )}

              {!hasFinalTimetable ? (
                <TimetableEmptyState kind="no-final" />
              ) : mode === "school" ? (
                filteredClasses.length > 0 ? (
                  <SchoolMasterTimetable timetable={timetable} classes={filteredClasses} />
                ) : (
                  <TimetableEmptyState kind="no-lessons" />
                )
              ) : mode === "class" ? (
                !selectedClassId || !selectedClass ? (
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

      {fullscreen && timetable && hasFinalTimetable && (
        <FullscreenTimetableOverview
          timetable={timetable}
          onClose={closeFullscreen}
          onPrint={() => window.print()}
        />
      )}

      <TimetableHistorySheet open={historyOpen} onOpenChange={setHistoryOpen} />
    </div>
  );
}
