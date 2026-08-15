import { useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
import { GenerationProgress } from "@/components/generator/generation-progress";
import { GeneratedSchedulePreview } from "@/components/generator/generated-schedule-preview";
import { GeneratorEmptyState } from "@/components/generator/generator-empty-state";
import { GeneratorReadiness } from "@/components/generator/generator-readiness";
import { withAppName } from "@/lib/branding";
import { getGeneratorErrorMessage } from "@/lib/generator-errors";
import {
  useGenerateSchedule,
  useGeneratorReadiness,
  useConfirmSchedule,
  useScheduleCandidate,
} from "@/lib/generator-queries";
import { useCoursesRepository } from "@/lib/mock-queries";
import { usePublishedClassSchedules } from "@/lib/timetable-queries";

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
  const generationInFlight = useRef(false);
  const confirmInFlight = useRef(false);
  const [generatedScheduleId, setGeneratedScheduleId] = useState<string | null>(null);
  const [fullPreviewOpen, setFullPreviewOpen] = useState(false);
  const [outcome, setOutcome] = useState<"idle" | "failed" | "no-feasible">("idle");
  const [failureMessage, setFailureMessage] = useState<string | null>(null);
  const [replacementWarningOpen, setReplacementWarningOpen] = useState(false);
  const [confirmedScheduleId, setConfirmedScheduleId] = useState<string | null>(null);
  const readiness = useGeneratorReadiness();
  const classIds = readiness.classes.map((item) => item.id);
  const publishedSchedule = usePublishedClassSchedules(classIds);
  const generatedSchedule = useScheduleCandidate(generatedScheduleId);
  const courses = useCoursesRepository({ filters: { active: true } });
  const generate = useGenerateSchedule();
  const confirm = useConfirmSchedule(classIds);
  const hasPublishedSchedule =
    publishedSchedule.data?.some((schedule) => schedule.items.length > 0) ?? false;

  const startGeneration = async () => {
    if (!readiness.data.ready || generate.isPending || generationInFlight.current) return;
    generationInFlight.current = true;
    setOutcome("idle");
    setFailureMessage(null);
    setGeneratedScheduleId(null);
    setConfirmedScheduleId(null);
    setFullPreviewOpen(false);
    try {
      const result = await generate.mutateAsync();
      if (!result.success || !result.candidateId) {
        setOutcome(result.status === "INFEASIBLE" ? "no-feasible" : "failed");
        return;
      }
      setGeneratedScheduleId(result.candidateId);
      toast.success("برنامه پیشنهادی با موفقیت تولید و در سرور ذخیره شد.");
    } catch (error) {
      setFailureMessage(getGeneratorErrorMessage(error));
      setOutcome("failed");
    } finally {
      generationInFlight.current = false;
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
        {outcome === "no-feasible" && (
          <GeneratorEmptyState kind="no-feasible" onRetry={startGeneration} />
        )}

        {generatedScheduleId && generatedSchedule.isPending && (
          <p className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">
            در حال دریافت پیش‌نمایش برنامه...
          </p>
        )}
        {generatedScheduleId && generatedSchedule.isError && (
          <GeneratorEmptyState kind="failed" message="دریافت برنامه تولیدشده با خطا مواجه شد." />
        )}
        {generatedSchedule.data && (
          <GeneratedSchedulePreview
            schedule={generatedSchedule.data}
            daySlotGroups={readiness.daySlotGroups}
            classes={readiness.classes}
            teachers={readiness.teachers}
            courses={courses.items}
            onOpenFullPreview={() => setFullPreviewOpen(true)}
            onConfirm={requestConfirmation}
            onOpenWeeklyTimetable={() => navigate({ to: "/dashboard/timetable" })}
            confirming={confirm.isPending}
            confirmed={confirmedScheduleId === generatedSchedule.data.id}
            confirmationReady={publishedSchedule.isSuccess}
          />
        )}

        <CandidatePreviewDialog
          candidate={generatedSchedule.data ?? null}
          open={fullPreviewOpen}
          loading={generatedSchedule.isPending}
          error={generatedSchedule.isError}
          daySlotGroups={readiness.daySlotGroups}
          classes={readiness.classes}
          teachers={readiness.teachers}
          courses={courses.items}
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
