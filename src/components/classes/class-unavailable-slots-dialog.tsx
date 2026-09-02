import { useEffect, useMemo, useState } from "react";
import { CalendarX2, LoaderCircle, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getClassUnavailableSlotsErrorMessage,
  selectValidUnavailableSlotIds,
  toggleUnavailableSlotSelection,
  useClassUnavailableSlots,
  useReplaceClassUnavailableSlots,
} from "@/lib/class-unavailability";
import { useDaySlotsRepository } from "@/lib/mock-queries";
import type { ClassViewModel } from "@/lib/class-management";
import { cn } from "@/lib/utils";
import { getWeekdayDisplayLabel } from "@/lib/weekday-labels";

export function ClassUnavailableSlotsDialog({
  classItem,
  open,
  onOpenChange,
}: {
  classItem: ClassViewModel;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const daySlots = useDaySlotsRepository();
  const unavailableSlots = useClassUnavailableSlots(classItem.id);
  const replaceUnavailableSlots = useReplaceClassUnavailableSlots();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [initialized, setInitialized] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const initialSelection = useMemo(
    () => selectValidUnavailableSlotIds(unavailableSlots.data ?? [], daySlots.data ?? []),
    [daySlots.data, unavailableSlots.data],
  );

  useEffect(
    function initializeSelectionFromServer() {
      if (initialized || !daySlots.isSuccess || !unavailableSlots.isSuccess) return;
      setSelectedIds(initialSelection);
      setInitialized(true);
    },
    [
      daySlots.isSuccess,
      initialSelection,
      initialized,
      unavailableSlots.data,
      unavailableSlots.isSuccess,
    ],
  );

  const loading = daySlots.isPending || unavailableSlots.isPending || !initialized;
  const loadError = daySlots.error ?? unavailableSlots.error;
  const isSaving = replaceUnavailableSlots.isPending;
  const activeSlotCount = (daySlots.data ?? []).reduce(
    (count, group) => count + group.slots.filter((slot) => slot.active).length,
    0,
  );

  const toggleSlot = (daySlotId: string) => {
    setSelectedIds((current) => toggleUnavailableSlotSelection(current, daySlotId));
    setSaveError(null);
  };

  const save = async () => {
    if (isSaving || loading || loadError) return;
    setSaveError(null);
    try {
      await replaceUnavailableSlots.mutateAsync({
        classId: classItem.id,
        daySlotIds: [...selectedIds],
      });
      toast.success("روز و زنگ خالی کلاس ذخیره شد.");
      onOpenChange(false);
    } catch (error) {
      setSaveError(getClassUnavailableSlotsErrorMessage(error, "save"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !isSaving && onOpenChange(nextOpen)}>
      <DialogContent dir="rtl" className="flex max-h-[90vh] flex-col sm:max-w-2xl">
        <DialogHeader className="shrink-0 text-right">
          <DialogTitle>روز و زنگ خالی کلاس</DialogTitle>
          <DialogDescription>
            روزها و زنگ‌هایی را انتخاب کنید که نباید برای این کلاس درسی در برنامه قرار بگیرد.
          </DialogDescription>
          <div className="flex items-center gap-2 pt-2 text-sm font-medium text-foreground">
            <CalendarX2 className="h-4 w-4 text-primary" aria-hidden="true" />
            <span>{classItem.name}</span>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto py-1">
          {loading && !loadError ? (
            <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-muted-foreground">
              <LoaderCircle className="h-5 w-5 animate-spin motion-reduce:animate-none" />
              در حال دریافت روزها و زنگ‌ها...
            </div>
          ) : loadError ? (
            <div
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
            >
              {getClassUnavailableSlotsErrorMessage(loadError, "load")}
            </div>
          ) : activeSlotCount === 0 ? (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              زنگ فعالی برای این مدرسه ثبت نشده است.
            </p>
          ) : (
            <div className="space-y-3">
              {(daySlots.data ?? []).map((group) => {
                const slots = group.slots.filter((slot) => slot.active);
                if (slots.length === 0) return null;
                return (
                  <section key={group.dayId} className="rounded-xl border bg-muted/20 p-3">
                    <h3 className="mb-2 text-sm font-semibold">
                      {getWeekdayDisplayLabel(group.dayName)}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {slots.map((slot) => {
                        const selected = selectedIds.has(slot.id);
                        return (
                          <Button
                            key={slot.id}
                            type="button"
                            size="sm"
                            variant={selected ? "default" : "outline"}
                            className={cn(
                              "h-auto min-h-10 flex-col gap-0.5 px-3",
                              selected && "shadow-sm",
                            )}
                            aria-pressed={selected}
                            onClick={() => toggleSlot(slot.id)}
                          >
                            <span>زنگ {slot.slotNumber.toLocaleString("fa-IR")}</span>
                            {slot.startTime && slot.endTime ? (
                              <span className="text-[10px] font-normal opacity-80" dir="ltr">
                                {slot.startTime.slice(0, 5)}–{slot.endTime.slice(0, 5)}
                              </span>
                            ) : null}
                          </Button>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </div>

        {saveError ? (
          <p role="alert" className="shrink-0 text-sm text-destructive">
            {saveError}
          </p>
        ) : null}

        <DialogFooter className="shrink-0 gap-2 sm:justify-start">
          <Button
            type="button"
            onClick={() => void save()}
            disabled={isSaving || loading || Boolean(loadError)}
          >
            {isSaving ? (
              <LoaderCircle className="me-2 h-4 w-4 animate-spin motion-reduce:animate-none" />
            ) : null}
            {isSaving ? "در حال ذخیره…" : "ذخیره"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            انصراف
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setSelectedIds(new Set())}
            disabled={isSaving || loading || selectedIds.size === 0}
          >
            <RotateCcw className="me-2 h-4 w-4" aria-hidden="true" />
            پاک کردن همه
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
