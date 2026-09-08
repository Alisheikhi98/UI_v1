import {
  useClassAssignmentsRepository,
  useClassesRepository,
  useCoursesRepository,
  useMajorsRepository,
  useTeachersRepository,
} from "@/lib/mock-queries";
import { selectClassViewModels, selectMajorOptions } from "@/lib/class-management-selectors";
import { useActiveSchoolId } from "@/lib/active-school";
import { useSchoolsRepository } from "@/lib/api/school-queries";
import { supportsMajor } from "@/lib/academic-policy";

export * from "@/lib/class-management-selectors";

export function useClassManagementData(activeClassId?: string) {
  const activeSchoolId = useActiveSchoolId();
  const schoolsRepository = useSchoolsRepository();
  const activeSchool = schoolsRepository.schools.find(
    (school) => String(school.id) === activeSchoolId,
  );
  const educationStage = activeSchool?.educationStage ?? null;
  const classesRepository = useClassesRepository();
  const majorsRepository = useMajorsRepository(supportsMajor(educationStage));
  const classIds = classesRepository.items.map((schoolClass) => schoolClass.id);
  const coursesRepository = useCoursesRepository({
    filters: activeClassId ? { classId: activeClassId } : undefined,
  });
  const teachersRepository = useTeachersRepository();
  const assignmentsRepository = useClassAssignmentsRepository({
    filters: { classIds },
  });
  const activeClassAssignmentsRepository = useClassAssignmentsRepository({
    filters: activeClassId ? { classId: activeClassId } : { classIds: [] },
  });

  return {
    classes: selectClassViewModels(
      classesRepository.items,
      majorsRepository.data ?? [],
      educationStage,
    ),
    educationStage,
    majorOptions: selectMajorOptions(majorsRepository.data ?? []),
    courses: coursesRepository.items,
    teachers: teachersRepository.items,
    assignments: assignmentsRepository.items,
    activeClassAssignments: activeClassAssignmentsRepository.items,
    classesRepository,
    majorsRepository,
    coursesRepository,
    teachersRepository,
    assignmentsRepository,
    activeClassAssignmentsRepository,
    schoolsRepository,
  };
}
