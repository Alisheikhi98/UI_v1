import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export const LONG_RUNNING_STATUS_DELAY_MS = 9_000;

const operationCopy = {
  generate: {
    label: "پیشرفت تولید برنامه",
    title: "در حال تولید برنامه…",
    description: "بررسی محدودیت‌ها و ساخت برنامه ممکن است چند لحظه طول بکشد.",
  },
  repair: {
    label: "پیشرفت بررسی تعمیر برنامه",
    title: "در حال بررسی راه‌حل‌های تعمیر برنامه…",
    description: "بررسی تغییرات لازم ممکن است چند لحظه طول بکشد.",
  },
} as const;

export function GenerationProgress({ operation }: { operation: keyof typeof operationCopy }) {
  const [showLongRunningMessage, setShowLongRunningMessage] = useState(false);
  const copy = operationCopy[operation];

  useEffect(function scheduleLongRunningMessage() {
    const timeoutId = window.setTimeout(
      () => setShowLongRunningMessage(true),
      LONG_RUNNING_STATUS_DELAY_MS,
    );
    return function cancelLongRunningMessage() {
      window.clearTimeout(timeoutId);
    };
  }, []);

  return (
    <section aria-live="polite" aria-atomic="true" aria-label={copy.label} aria-busy="true">
      <Card className="overflow-hidden border-primary/25">
        <CardContent className="flex min-w-0 items-start gap-3 p-4 sm:p-5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <LoaderCircle className="h-4.5 w-4.5 animate-spin motion-reduce:animate-none" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold leading-6 sm:text-base">{copy.title}</h2>
            <p className="text-xs leading-5 text-muted-foreground sm:text-sm">{copy.description}</p>
            {showLongRunningMessage ? (
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                پردازش همچنان ادامه دارد؛ لطفاً صفحه را نبندید.
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
