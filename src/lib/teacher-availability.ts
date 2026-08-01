import type { DaySlotGroup } from "@/lib/types";

const allSlotIds = (groups: readonly DaySlotGroup[]) =>
  groups.flatMap((group) => group.slots.map((slot) => slot.id));

export function normalizeDaySlotGroups(groups: readonly DaySlotGroup[]): DaySlotGroup[] {
  return groups.map((group) => ({
    ...group,
    slots: [...group.slots]
      .filter((slot) => slot.active && slot.dayId === group.dayId)
      .sort((first, second) => first.slotNumber - second.slotNumber),
  }));
}

export function sanitizeAvailabilitySelection(
  groups: readonly DaySlotGroup[],
  daySlotIds: readonly string[],
): string[] {
  const requested = new Set(daySlotIds);
  return allSlotIds(groups).filter((id) => requested.has(id));
}

export function toggleAvailabilitySlot(
  selectedIds: readonly string[],
  daySlotId: string,
): string[] {
  const selected = new Set(selectedIds);
  if (selected.has(daySlotId)) selected.delete(daySlotId);
  else selected.add(daySlotId);
  return [...selected];
}

export function toggleWeekdayAvailability(
  selectedIds: readonly string[],
  group: DaySlotGroup,
): string[] {
  const selected = new Set(selectedIds);
  const slotIds = group.slots.map((slot) => slot.id);
  const allSelected = slotIds.length > 0 && slotIds.every((id) => selected.has(id));
  slotIds.forEach((id) => (allSelected ? selected.delete(id) : selected.add(id)));
  return [...selected];
}

export function isWeekdayFullySelected(
  selectedIds: readonly string[],
  group: DaySlotGroup,
): boolean {
  const selected = new Set(selectedIds);
  return group.slots.length > 0 && group.slots.every((slot) => selected.has(slot.id));
}

export class TeacherAvailabilitySaveInProgressError extends Error {
  constructor() {
    super("Teacher availability is already being saved.");
    this.name = "TeacherAvailabilitySaveInProgressError";
  }
}

export class TeacherAvailabilitySaveGuard {
  private pending = false;

  async run<T>(save: () => Promise<T>): Promise<T> {
    if (this.pending) throw new TeacherAvailabilitySaveInProgressError();
    this.pending = true;
    try {
      return await save();
    } finally {
      this.pending = false;
    }
  }
}
