export const EDUCATION_STAGES = {
  secondaryFirst: "secondary_first",
  secondarySecond: "secondary_second",
} as const;

export type EducationStage = (typeof EDUCATION_STAGES)[keyof typeof EDUCATION_STAGES];

export const EDUCATION_STAGE_OPTIONS = [
  { value: EDUCATION_STAGES.secondaryFirst, label: "متوسطه اول" },
  { value: EDUCATION_STAGES.secondarySecond, label: "متوسطه دوم" },
] as const satisfies readonly { value: EducationStage; label: string }[];

const GRADE_OPTIONS_BY_STAGE = {
  [EDUCATION_STAGES.secondaryFirst]: [
    { value: "7", label: "پایه هفتم" },
    { value: "8", label: "پایه هشتم" },
    { value: "9", label: "پایه نهم" },
  ],
  [EDUCATION_STAGES.secondarySecond]: [
    { value: "10", label: "پایه دهم" },
    { value: "11", label: "پایه یازدهم" },
    { value: "12", label: "پایه دوازدهم" },
  ],
} as const satisfies Record<EducationStage, readonly { value: string; label: string }[]>;

export const ALL_GRADE_OPTIONS = [
  ...GRADE_OPTIONS_BY_STAGE[EDUCATION_STAGES.secondaryFirst],
  ...GRADE_OPTIONS_BY_STAGE[EDUCATION_STAGES.secondarySecond],
] as const;

export function getEducationStageLabel(stage: EducationStage): string {
  return EDUCATION_STAGE_OPTIONS.find((option) => option.value === stage)?.label ?? stage;
}

export function getGradeOptions(stage: EducationStage | null | undefined) {
  return stage ? GRADE_OPTIONS_BY_STAGE[stage] : [];
}

export function supportsMajor(stage: EducationStage | null | undefined): boolean {
  return stage === EDUCATION_STAGES.secondarySecond;
}
