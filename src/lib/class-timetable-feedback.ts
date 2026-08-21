export const CLASS_TIMETABLE_FEEDBACK_DURATION_MS = 2_500;

export type ClassTimetableFeedback = {
  classId: string;
  message: string;
};

type TimeoutScheduler = (callback: () => void, delay: number) => unknown;
type TimeoutCanceller = (handle: unknown) => void;

export function createClassTimetableFeedbackController(
  onChange: (feedback: ClassTimetableFeedback | null) => void,
  options: {
    duration?: number;
    schedule?: TimeoutScheduler;
    cancel?: TimeoutCanceller;
  } = {},
) {
  const duration = options.duration ?? CLASS_TIMETABLE_FEEDBACK_DURATION_MS;
  const schedule: TimeoutScheduler =
    options.schedule ?? ((callback, delay) => globalThis.setTimeout(callback, delay));
  const cancel: TimeoutCanceller =
    options.cancel ??
    ((handle) => globalThis.clearTimeout(handle as ReturnType<typeof setTimeout>));
  let timeout: unknown = null;

  const cancelPendingTimeout = () => {
    if (timeout === null) return;
    cancel(timeout);
    timeout = null;
  };

  return {
    show(feedback: ClassTimetableFeedback) {
      cancelPendingTimeout();
      onChange(feedback);
      timeout = schedule(() => {
        timeout = null;
        onChange(null);
      }, duration);
    },
    clear() {
      cancelPendingTimeout();
      onChange(null);
    },
    dispose() {
      cancelPendingTimeout();
    },
  };
}
