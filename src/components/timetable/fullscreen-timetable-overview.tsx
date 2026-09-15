import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Maximize2, Minus, Plus, Printer, X } from "lucide-react";
import { SchoolMasterTimetable } from "@/components/timetable/school-master-timetable";
import { Button } from "@/components/ui/button";
import type { NormalizedTimetable } from "@/lib/timetable";
import {
  calculateTimetableFitScale,
  getNextTimetableZoom,
  MAX_TIMETABLE_SCALE,
  MIN_TIMETABLE_SCALE,
} from "@/lib/timetable-viewport";

type ZoomMode = "fit" | "manual";

export function FullscreenTimetableOverview({
  timetable,
  onClose,
  onPrint,
}: {
  timetable: NormalizedTimetable;
  onClose: () => void;
  onPrint: () => void;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [zoomMode, setZoomMode] = useState<ZoomMode>("fit");
  const [fitScale, setFitScale] = useState(1);
  const [manualScale, setManualScale] = useState(1);
  const [fitsAtReadableScale, setFitsAtReadableScale] = useState(true);
  const [intrinsicSize, setIntrinsicSize] = useState({ width: 0, height: 0 });
  const activeScale = zoomMode === "fit" ? fitScale : manualScale;

  const recalculateFit = useCallback(() => {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!viewport || !content) return;

    const viewportStyle = window.getComputedStyle(viewport);
    const availableWidth =
      viewport.clientWidth -
      Number.parseFloat(viewportStyle.paddingLeft) -
      Number.parseFloat(viewportStyle.paddingRight);
    const availableHeight =
      viewport.clientHeight -
      Number.parseFloat(viewportStyle.paddingTop) -
      Number.parseFloat(viewportStyle.paddingBottom);
    const timetableWidth = content.scrollWidth;
    const timetableHeight = content.scrollHeight;
    const nextFit = calculateTimetableFitScale({
      availableWidth,
      availableHeight,
      timetableWidth,
      timetableHeight,
    });

    setIntrinsicSize({ width: timetableWidth, height: timetableHeight });
    setFitScale(nextFit.scale);
    setFitsAtReadableScale(nextFit.fitsAtReadableScale);
  }, []);

  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.classList.add("timetable-fullscreen-active");
    overlayRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.classList.remove("timetable-fullscreen-active");
      previousFocusRef.current?.focus();
    };
  }, [onClose]);

  useEffect(() => {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!viewport || !content) return;

    let animationFrame = requestAnimationFrame(recalculateFit);
    const scheduleMeasurement = () => {
      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(recalculateFit);
    };
    const resizeObserver = new ResizeObserver(scheduleMeasurement);
    resizeObserver.observe(viewport);
    resizeObserver.observe(content);
    window.addEventListener("orientationchange", scheduleMeasurement);

    return () => {
      cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      window.removeEventListener("orientationchange", scheduleMeasurement);
    };
  }, [recalculateFit]);

  const changeZoom = (direction: "in" | "out") => {
    const nextScale = getNextTimetableZoom(activeScale, direction);
    setManualScale(nextScale);
    setZoomMode("manual");
  };

  if (typeof document === "undefined") return null;

  const stageWidth = intrinsicSize.width * activeScale;
  const stageHeight = intrinsicSize.height * activeScale;
  const stickyContext = zoomMode === "manual" || !fitsAtReadableScale;

  return createPortal(
    <div
      ref={overlayRef}
      className="fullscreen-timetable-overview fixed inset-0 z-[100] flex h-dvh w-screen flex-col overflow-hidden bg-background"
      data-testid="fullscreen-timetable-overview"
      data-zoom-mode={zoomMode}
      dir="rtl"
      role="region"
      aria-label="نمای کلی برنامه هفتگی مدرسه"
      tabIndex={-1}
    >
      <div className="fullscreen-timetable-toolbar print-hidden flex shrink-0 items-center justify-between gap-2 border-b border-primary/10 bg-background px-2 py-2 shadow-sm sm:px-4 sm:py-3">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-bold sm:text-lg">برنامه هفتگی مدرسه</h2>
          <p className="truncate text-[11px] text-muted-foreground sm:text-xs">
            {timetable.schoolName}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1" aria-label="کنترل بزرگ‌نمایی برنامه">
          <Button
            type="button"
            variant={zoomMode === "fit" ? "secondary" : "ghost"}
            size="sm"
            className="h-9 px-2 sm:px-3"
            aria-pressed={zoomMode === "fit"}
            onClick={() => setZoomMode("fit")}
          >
            <Maximize2 className="h-4 w-4" />
            <span className="hidden sm:inline">جا دادن در صفحه</span>
            <span className="sm:hidden">Fit</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9"
            aria-label="کوچک‌نمایی برنامه"
            disabled={activeScale <= MIN_TIMETABLE_SCALE + 0.001}
            onClick={() => changeZoom("out")}
          >
            <Minus />
          </Button>
          <output
            className="w-11 text-center text-xs font-medium tabular-nums sm:w-12"
            aria-live="polite"
            aria-label={`مقیاس برنامه ${Math.round(activeScale * 100)} درصد`}
          >
            {Math.round(activeScale * 100).toLocaleString("fa-IR")}%
          </output>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9"
            aria-label="بزرگ‌نمایی برنامه"
            disabled={activeScale >= MAX_TIMETABLE_SCALE - 0.001}
            onClick={() => changeZoom("in")}
          >
            <Plus />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="hidden h-9 w-9 sm:inline-flex"
            aria-label="چاپ برنامه"
            onClick={onPrint}
          >
            <Printer />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            aria-label="خروج از تمام صفحه"
            onClick={onClose}
          >
            <X />
          </Button>
        </div>
      </div>

      <p className="print-hidden border-b border-primary/10 bg-primary/[0.04] px-2 py-1 text-center text-[11px] text-muted-foreground sm:hidden">
        برای مشاهده بهتر برنامه، گوشی را افقی کنید.
      </p>

      <div
        ref={viewportRef}
        className="fullscreen-timetable-viewport timetable-scroll min-h-0 flex-1 overflow-auto overscroll-contain bg-background p-2 sm:p-4"
        data-testid="fullscreen-timetable-viewport"
      >
        <div
          className="fullscreen-timetable-stage relative mx-auto shrink-0"
          style={{ width: stageWidth, height: stageHeight }}
        >
          <div
            ref={contentRef}
            id="timetable-fullscreen-print-root"
            className="fullscreen-timetable-scaled absolute start-0 top-0 w-max origin-top-right overflow-hidden border border-primary/10 bg-background"
            style={{ transform: `scale(${activeScale})` }}
          >
            <div className="timetable-print-only mb-4 text-center">
              <h1 className="text-xl font-bold">برنامه هفتگی مدرسه</h1>
              <p>{timetable.schoolName}</p>
            </div>
            <SchoolMasterTimetable
              timetable={timetable}
              classes={timetable.classes}
              overview
              stickyContext={stickyContext}
            />
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
