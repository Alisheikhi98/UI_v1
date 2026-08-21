import { useEffect, useState } from "react";
import { CalendarDays, Eye, History, LoaderCircle, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EntityTimetable } from "@/components/timetable/entity-timetable";
import { SchoolMasterTimetable } from "@/components/timetable/school-master-timetable";
import { scheduleStatusLabel, type ScheduleCandidateSummary } from "@/lib/scheduler";
import type { TimetableViewMode } from "@/lib/timetable";
import { useHistoricalCandidateTimetable, useScheduleHistory } from "@/lib/timetable-queries";
import { cn } from "@/lib/utils";

function formatCandidateDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "زمان تولید ثبت نشده";
  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function HistoryListItem({
  candidate,
  active,
  onSelect,
}: {
  candidate: ScheduleCandidateSummary;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "w-full rounded-lg border p-3 text-start transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active && "border-primary bg-primary/5",
      )}
      onClick={onSelect}
      aria-pressed={active}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold">{formatCandidateDate(candidate.createdAt)}</span>
        <Badge variant={candidate.selected ? "default" : "secondary"}>
          {candidate.selected ? "برنامه فعلی" : "برنامه قبلی"}
        </Badge>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{scheduleStatusLabel(candidate.status)}</span>
        <span>فاصله معلمان: {candidate.totalGap.toLocaleString("fa-IR")}</span>
      </div>
    </button>
  );
}

function HistoryLoading() {
  return (
    <div className="space-y-3" aria-label="در حال دریافت تاریخچه برنامه‌ها">
      {[0, 1, 2].map((item) => (
        <Skeleton key={item} className="h-20 w-full rounded-lg" />
      ))}
    </div>
  );
}

export function TimetableHistorySheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [mode, setMode] = useState<TimetableViewMode>("school");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const history = useScheduleHistory(open);
  const detail = useHistoricalCandidateTimetable(selectedCandidateId, open);

  useEffect(() => {
    if (open) return;
    setSelectedCandidateId(null);
    setMode("school");
    setSelectedClassId("");
    setSelectedTeacherId("");
  }, [open]);

  const selectCandidate = (candidateId: string) => {
    setSelectedCandidateId(candidateId);
    setMode("school");
    setSelectedClassId("");
    setSelectedTeacherId("");
  };

  const timetable = detail.data;
  const selectedClassHasLessons = timetable?.entries.some(
    (entry) => entry.classId === selectedClassId,
  );
  const selectedTeacherHasLessons = timetable?.entries.some(
    (entry) => entry.teacherId === selectedTeacherId,
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        dir="rtl"
        className="flex h-dvh w-[calc(100%-1rem)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(94vw,84rem)]"
      >
        <SheetHeader className="shrink-0 border-b px-4 py-4 pe-14 sm:px-6 sm:py-5 sm:pe-14">
          <div className="flex flex-wrap items-center gap-2">
            <SheetTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              تاریخچه برنامه‌ها
            </SheetTitle>
            <Badge variant="outline" className="gap-1">
              <Eye className="h-3.5 w-3.5" />
              فقط برای مشاهده
            </Badge>
          </div>
          <SheetDescription>
            برنامه‌های تولیدشده قبلی را بدون تغییر برنامه فعلی مدرسه بررسی کنید.
          </SheetDescription>
        </SheetHeader>

        <div className="grid min-h-0 flex-1 lg:grid-cols-[19rem_minmax(0,1fr)]">
          <aside className="max-h-64 overflow-y-auto border-b p-3 lg:max-h-none lg:border-b-0 lg:border-l lg:p-4">
            {history.isPending ? (
              <HistoryLoading />
            ) : history.isError ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-center">
                <p className="text-sm text-destructive">دریافت تاریخچه برنامه‌ها ممکن نشد.</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => void history.refetch()}
                >
                  <RefreshCw className="h-4 w-4" />
                  تلاش دوباره
                </Button>
              </div>
            ) : history.data?.length ? (
              <div className="space-y-2" data-testid="schedule-history-list">
                {history.data.map((candidate) => (
                  <HistoryListItem
                    key={candidate.id}
                    candidate={candidate}
                    active={selectedCandidateId === candidate.id}
                    onSelect={() => selectCandidate(candidate.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-6 text-center">
                <CalendarDays className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-3 text-sm text-muted-foreground">
                  هنوز برنامه‌ای در تاریخچه وجود ندارد.
                </p>
              </div>
            )}
          </aside>

          <section className="min-h-0 overflow-y-auto" aria-label="نمای برنامه تاریخی">
            {!selectedCandidateId ? (
              <div className="flex min-h-64 items-center justify-center p-6 text-center lg:min-h-full">
                <div>
                  <Eye className="mx-auto h-9 w-9 text-muted-foreground" />
                  <p className="mt-3 text-sm text-muted-foreground">
                    برای مشاهده جزئیات، یکی از برنامه‌های تاریخچه را انتخاب کنید.
                  </p>
                </div>
              </div>
            ) : detail.isPending ? (
              <div className="flex min-h-64 items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
                <LoaderCircle className="h-5 w-5 animate-spin" />
                در حال دریافت برنامه انتخاب‌شده...
              </div>
            ) : detail.isError || !detail.candidate || !timetable ? (
              <div className="flex min-h-64 items-center justify-center p-6 text-center">
                <div>
                  <p className="text-sm text-destructive">جزئیات این برنامه دریافت نشد.</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => void detail.refetch()}
                  >
                    <RefreshCw className="h-4 w-4" />
                    تلاش دوباره
                  </Button>
                </div>
              </div>
            ) : (
              <div data-testid="historical-timetable-viewer">
                <div className="sticky top-0 z-40 border-b bg-background/95 p-3 backdrop-blur sm:p-4">
                  <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">برنامه تولیدشده قبلی</h3>
                        <Badge variant={detail.candidate.selected ? "default" : "secondary"}>
                          {detail.candidate.selected ? "برنامه فعلی" : "برنامه قبلی"}
                        </Badge>
                        <Badge variant="outline">فقط برای مشاهده</Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatCandidateDate(detail.candidate.createdAt)} •{" "}
                        {detail.candidate.lessons.length.toLocaleString("fa-IR")} جلسه
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <Tabs
                        value={mode}
                        onValueChange={(value) => setMode(value as TimetableViewMode)}
                        dir="rtl"
                      >
                        <TabsList className="grid w-full grid-cols-3 sm:w-64">
                          <TabsTrigger value="school">مدرسه</TabsTrigger>
                          <TabsTrigger value="class">کلاس</TabsTrigger>
                          <TabsTrigger value="teacher">معلم</TabsTrigger>
                        </TabsList>
                      </Tabs>
                      {mode === "class" && (
                        <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                          <SelectTrigger className="w-full sm:w-48">
                            <SelectValue placeholder="انتخاب کلاس" />
                          </SelectTrigger>
                          <SelectContent>
                            {timetable.classes.map((item) => (
                              <SelectItem key={item.id} value={item.id}>
                                {item.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      {mode === "teacher" && (
                        <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
                          <SelectTrigger className="w-full sm:w-48">
                            <SelectValue placeholder="انتخاب معلم" />
                          </SelectTrigger>
                          <SelectContent>
                            {timetable.teachers.map((item) => (
                              <SelectItem key={item.id} value={item.id}>
                                {item.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                </div>

                {mode === "school" ? (
                  <SchoolMasterTimetable timetable={timetable} classes={timetable.classes} />
                ) : mode === "class" && selectedClassId && selectedClassHasLessons ? (
                  <EntityTimetable timetable={timetable} mode="class" entityId={selectedClassId} />
                ) : mode === "teacher" && selectedTeacherId && selectedTeacherHasLessons ? (
                  <EntityTimetable
                    timetable={timetable}
                    mode="teacher"
                    entityId={selectedTeacherId}
                  />
                ) : (
                  <p className="p-10 text-center text-sm text-muted-foreground">
                    {mode === "class" ? "یک کلاس را انتخاب کنید." : "یک معلم را انتخاب کنید."}
                  </p>
                )}
              </div>
            )}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
