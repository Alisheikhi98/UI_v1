export const TIMETABLE_ZOOM_LEVELS = [0.6, 0.7, 0.8, 0.9, 1, 1.1, 1.2] as const;

export const MIN_TIMETABLE_SCALE = TIMETABLE_ZOOM_LEVELS[0];
export const MAX_TIMETABLE_SCALE = TIMETABLE_ZOOM_LEVELS.at(-1) ?? 1.2;

export function calculateTimetableFitScale({
  availableWidth,
  availableHeight,
  timetableWidth,
  timetableHeight,
}: {
  availableWidth: number;
  availableHeight: number;
  timetableWidth: number;
  timetableHeight: number;
}) {
  if (availableWidth <= 0 || availableHeight <= 0 || timetableWidth <= 0 || timetableHeight <= 0) {
    return { scale: 1, fitsAtReadableScale: true };
  }

  const naturalScale = Math.min(
    availableWidth / timetableWidth,
    availableHeight / timetableHeight,
    1,
  );

  return {
    scale: Math.max(MIN_TIMETABLE_SCALE, naturalScale),
    fitsAtReadableScale: naturalScale >= MIN_TIMETABLE_SCALE,
  };
}

export function getNextTimetableZoom(currentScale: number, direction: "in" | "out") {
  const levels = [...TIMETABLE_ZOOM_LEVELS];

  if (direction === "in") {
    return levels.find((level) => level > currentScale + 0.001) ?? MAX_TIMETABLE_SCALE;
  }

  return levels.reverse().find((level) => level < currentScale - 0.001) ?? MIN_TIMETABLE_SCALE;
}
