import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Header } from "@/components/header";
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
import { CandidatePreviewDialog } from "@/components/generator/candidate-preview-dialog";
import { AvailabilityRepairResult } from "@/components/generator/availability-repair-result";
import { GenerationProgress } from "@/components/generator/generation-progress";
import { GeneratedSchedulePreview } from "@/components/generator/generated-schedule-preview";
import { GeneratorEmptyState } from "@/components/generator/generator-empty-state";
import { GeneratorReadiness } from "@/components/generator/generator-readiness";
import { InfeasibleDiagnostics } from "@/components/generator/infeasible-diagnostics";
import { SchedulerConstraintControls } from "@/components/generator/scheduler-constraint-controls";
import { useActiveSchoolId } from "@/lib/active-school";
import type { AuthenticatedUser } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { useSchoolsRepository } from "@/lib/api/school-queries";
import { authenticatedUserQueryKey } from "@/lib/auth-session";
import { withAppName } from "@/lib/branding";
import { getGeneratorErrorMessage } from "@/lib/generator-errors";
import {
  useGeneratorConflictReport,
  useGeneratorPreviewReference,
} from "@/lib/generator-preview-session";
import {
  useGenerateSchedule,
  useGeneratorReadiness,
  useRepairScheduleAvailability,
  useConfirmSchedule,
  useScheduleCandidate,
} from "@/lib/generator-queries";
import { usePublishedClassSchedules } from "@/lib/timetable-queries";
import { repositoryQueryKeys } from "@/lib/repository-query-keys";
import {
  DEFAULT_SCHEDULE_GENERATION_SETTINGS,
  getMaximumPeriodsPerDay,
  parseScheduleGenerationSettings,
  type ScheduleCandidateDetail,
  type ScheduleRepairResult,
} from "@/lib/scheduler";
import { normalizeCandidateTimetable } from "@/lib/timetable";

export const Route = createFileRoute("/dashboard/generator")({
  head: () => ({
    meta: [
      { title: withAppName("تولید برنامه") },
      {
        name: "description",
        content: "اطلاعات مدرسه را بررسی کنید و برنامه هفتگی را با موتور زمان‌بندی تولید کنید.",
      },
    ],
  }),
  component: ScheduleGeneratorPage,
});

function ScheduleGeneratorPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const activeSchoolId = useActiveSchoolId();
  const authenticatedUser = queryClient.getQueryData<AuthenticatedUser>(authenticatedUserQueryKey);
  const authenticatedUserId = authenticatedUser ? String(authenticatedUser.id) : null;
  const {
    reference: previewReference,
    save: savePreviewReference,
    clear: clearPreviewReference,
  } = useGeneratorPreviewReference(authenticatedUserId, activeSchoolId);
  const {
    reference: conflictReport,
    save: saveConflictReport,
    clear: clearConflictReport,
  } = useGeneratorConflictReport(authenticatedUserId, activeSchoolId);
  const generationInFlight = useRef(false);
  const repairInFlight = useRef(false);
  const confirmInFlight = useRef(false);
  const generatedScheduleId = previewReference?.candidateId ?? null;
  const [fullPreviewOpen, setFullPreviewOpen] = useState(false);
  const [outcome, setOutcome] = useState<"idle" | "failed" | "no-feasible">("idle");
  const [failureMessage, setFailureMessage] = useState<string | null>(null);
  const [repairResult, setRepairResult] = useState<ScheduleRepairResult | null>(null);
  const [repairError, setRepairError] = useState<string | null>(null);
  const [replacementWarningOpen, setReplacementWarningOpen] = useState(false);
  const [confirmedScheduleId, setConfirmedScheduleId] = useState<string | null>(null);
  const [minimizeGaps, setMinimizeGaps] = useState(
    DEFAULT_SCHEDULE_GENERATION_SETTINGS.minimizeGaps,
  );
  const [maxSameCourseSlotsPerDay, setMaxSameCourseSlotsPerDay] = useState("");
  const readiness = useGeneratorReadiness();
  const classIds = readiness.classes.map((item) => item.id);
  const publishedSchedule = usePublishedClassSchedules(classIds);
  const generatedSchedule = useScheduleCandidate(generatedScheduleId);
  const schools = useSchoolsRepository();
  const generate = useGenerateSchedule();
  const repair = useRepairScheduleAvailability();
  const confirm = useConfirmSchedule(classIds);
  const hasPublishedSchedule =
    publishedSchedule.data?.some((schedule) => schedule.items.length > 0) ?? false;
  const maximumPeriodsPerDay = getMaximumPeriodsPerDay(readiness.daySlotGroups);
  const generationSettings = parseScheduleGenerationSettings({
    minimizeGaps,
    maxSameCourseSlotsPerDay,
    maximumPeriodsPerDay,
  });
  const activeSchool = schools.schools.find((school) => String(school.id) === activeSchoolId);
  const missingGeneratedCandidate =
    generatedSchedule.error instanceof ApiError && generatedSchedule.error.status === 404;

  useEffect(
    function clearUnavailableCandidateReference() {
      if (!generatedScheduleId || !missingGeneratedCandidate) return;
      clearPreviewReference();
      setFullPreviewOpen(false);
      setConfirmedScheduleId(null);
    },
    [clearPreviewReference, generatedScheduleId, missingGeneratedCandidate],
  );
  const generatedTimetable = useMemo(() => {
    if (!generatedSchedule.data || !activeSchool) return null;
    return normalizeCandidateTimetable({
      candidate: generatedSchedule.data,
      schoolName: activeSchool.name,
      classes: readiness.classes,
      teachers: readiness.teachers,
      assignmentCourseReferences: readiness.assignmentCourseReferences,
      daySlotGroups: readiness.daySlotGroups,
    });
  }, [
    activeSchool,
    generatedSchedule.data,
    readiness.classes,
    readiness.assignmentCourseReferences,
    readiness.daySlotGroups,
    readiness.teachers,
  ]);

  const startGeneration = async () => {
    if (
      !readiness.data.ready ||
      !generationSettings.settings ||
      generate.isPending ||
      generationInFlight.current
    )
      return;
    generationInFlight.current = true;
    setOutcome("idle");
    setFailureMessage(null);
    setRepairResult(null);
    setRepairError(null);
    setFullPreviewOpen(false);
    try {
      const result = await generate.mutateAsync(generationSettings.settings);
      if (!result.success || !result.candidateId) {
        if (result.status === "INFEASIBLE") saveConflictReport(result.diagnostics);
        setOutcome(result.status === "INFEASIBLE" ? "no-feasible" : "failed");
        return;
      }
      const candidate = queryClient.getQueryData<ScheduleCandidateDetail>(
        repositoryQueryKeys.scheduleCandidate(activeSchoolId, result.candidateId),
      );
      if (!candidate) {
        setFailureMessage("دریافت برنامه تولیدشده با خطا مواجه شد.");
        setOutcome("failed");
        return;
      }
      clearConflictReport();
      savePreviewReference(candidate.id, candidate.createdAt);
      setConfirmedScheduleId(null);
      toast.success("برنامه پیشنهادی با موفقیت تولید و در سرور ذخیره شد.");
    } catch (error) {
      setFailureMessage(getGeneratorErrorMessage(error));
      setOutcome("failed");
    } finally {
      generationInFlight.current = false;
    }
  };

  const dismissGeneratedPreview = () => {
    clearPreviewReference();
    setFullPreviewOpen(false);
    setReplacementWarningOpen(false);
    setConfirmedScheduleId(null);
    setOutcome("idle");
    setFailureMessage(null);
    setRepairResult(null);
    setRepairError(null);
  };

  const dismissConflictReport = () => {
    clearConflictReport();
    setOutcome("idle");
    setRepairResult(null);
    setRepairError(null);
  };

  const repairAvailability = async () => {
    if (
      !conflictReport ||
      !generationSettings.settings ||
      repair.isPending ||
      repairInFlight.current
    )
      return;
    repairInFlight.current = true;
    setRepairError(null);
    try {
      const result = await repair.mutateAsync(generationSettings.settings);
      setRepairResult(result);
    } catch (error) {
      setRepairError(getGeneratorErrorMessage(error));
    } finally {
      repairInFlight.current = false;
    }
  };

  const confirmGeneratedSchedule = async () => {
    if (!generatedScheduleId || confirm.isPending || confirmInFlight.current) return;
    confirmInFlight.current = true;
    try {
      await confirm.mutateAsync(generatedScheduleId);
      setConfirmedScheduleId(generatedScheduleId);
      setReplacementWarningOpen(false);
      setFullPreviewOpen(false);
      toast.success("برنامه هفتگی با موفقیت ثبت شد.");
    } catch (error) {
      toast.error(getGeneratorErrorMessage(error));
    } finally {
      confirmInFlight.current = false;
    }
  };

  const requestConfirmation = () => {
    if (!publishedSchedule.isSuccess) return;
    if (hasPublishedSchedule) setReplacementWarningOpen(true);
    else void confirmGeneratedSchedule();
  };

  const loadingReadiness = readiness.loading;
  const readinessFailed = Boolean(readiness.error);

  return (
    <div className="flex flex-col" dir="rtl">
      <Header
        title="تولید برنامه هفتگی"
        description="آمادگی اطلاعات مدرسه را بررسی کنید و برنامه پیشنهادی واقعی بسازید."
      />
      <main className="space-y-6 p-4 sm:p-6">
        {loadingReadiness && (
          <p className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">
            در حال بررسی اطلاعات موردنیاز زمان‌بندی...
          </p>
        )}
        {readinessFailed && (
          <GeneratorEmptyState
            kind="failed"
            message="دریافت اطلاعات آمادگی از سرور با خطا مواجه شد."
          />
        )}
        {!loadingReadiness && !readinessFailed && (
          <GeneratorReadiness
            items={readiness.data.items}
            issues={readiness.data.issues}
            onGenerate={startGeneration}
            pending={generate.isPending}
            generationDisabled={!generationSettings.settings}
            generationControls={
              <SchedulerConstraintControls
                minimizeGaps={minimizeGaps}
                onMinimizeGapsChange={setMinimizeGaps}
                maxSameCourseSlotsPerDay={maxSameCourseSlotsPerDay}
                onMaxSameCourseSlotsPerDayChange={setMaxSameCourseSlotsPerDay}
                maximumPeriodsPerDay={maximumPeriodsPerDay}
                error={generationSettings.error}
                disabled={generate.isPending}
              />
            }
          />
        )}

        {generate.isPending && <GenerationProgress />}
        {outcome === "failed" && (
          <GeneratorEmptyState
            kind="failed"
            message={failureMessage ?? undefined}
            onRetry={startGeneration}
          />
        )}
        {conflictReport ? (
          <InfeasibleDiagnostics
            diagnostics={conflictReport.diagnostics}
            teachers={readiness.teachers}
            classes={readiness.classes}
            courses={readiness.assignmentCourseReferences.map((reference) => ({
              id: reference.courseId,
              name: reference.courseName,
            }))}
            daySlotGroups={readiness.daySlotGroups}
            assignments={readiness.assignments}
            onDismiss={dismissConflictReport}
            onRetry={startGeneration}
            onRepair={repairAvailability}
            pending={generate.isPending}
            repairPending={repair.isPending}
            repairError={repairError}
          />
        ) : null}
        {conflictReport && repairResult ? (
          <AvailabilityRepairResult
            result={repairResult}
            teachers={readiness.teachers}
            classes={readiness.classes}
            assignmentCourseReferences={readiness.assignmentCourseReferences}
            daySlotGroups={readiness.daySlotGroups}
          />
        ) : null}

        {generatedScheduleId && generatedSchedule.isPending && (
          <p className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">
            در حال دریافت پیش‌نمایش برنامه...
          </p>
        )}
        {generatedScheduleId && generatedSchedule.isError && !missingGeneratedCandidate && (
          <GeneratorEmptyState kind="failed" message="دریافت برنامه تولیدشده با خطا مواجه شد." />
        )}
        {generatedSchedule.data && generatedTimetable && (
          <GeneratedSchedulePreview
            timetable={generatedTimetable}
            onOpenFullPreview={() => setFullPreviewOpen(true)}
            onConfirm={requestConfirmation}
            onOpenWeeklyTimetable={() => navigate({ to: "/dashboard/timetable" })}
            confirming={confirm.isPending}
            confirmed={
              generatedSchedule.data.selected || confirmedScheduleId === generatedSchedule.data.id
            }
            confirmationReady={publishedSchedule.isSuccess}
            generatedAt={generatedSchedule.data.createdAt}
            onDismiss={dismissGeneratedPreview}
          />
        )}

        <CandidatePreviewDialog
          candidate={generatedSchedule.data ?? null}
          open={fullPreviewOpen}
          loading={generatedSchedule.isPending}
          error={generatedSchedule.isError}
          timetable={generatedTimetable}
          onOpenChange={setFullPreviewOpen}
        />

        <AlertDialog
          open={replacementWarningOpen}
          onOpenChange={(open) => {
            if (!confirm.isPending) setReplacementWarningOpen(open);
          }}
        >
          <AlertDialogContent dir="rtl">
            <AlertDialogHeader className="text-right sm:text-right">
              <AlertDialogTitle>جایگزینی برنامه هفتگی فعلی</AlertDialogTitle>
              <AlertDialogDescription>
                با ثبت این برنامه، برنامه هفتگی فعلی مدرسه جایگزین می‌شود. آیا ادامه می‌دهید؟
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={confirm.isPending}>انصراف</AlertDialogCancel>
              <AlertDialogAction
                onClick={(event) => {
                  event.preventDefault();
                  void confirmGeneratedSchedule();
                }}
                disabled={confirm.isPending}
              >
                {confirm.isPending ? "در حال ثبت..." : "تأیید و جایگزینی"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}
