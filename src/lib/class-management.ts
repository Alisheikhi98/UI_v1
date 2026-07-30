import {
  useClassAssignmentsRepository,
  useClassesRepository,
  useCoursesRepository,
  useTeachersRepository,
} from "@/lib/mock-queries";
import { selectClassViewModels } from "@/lib/class-management-selectors";

export * from "@/lib/class-management-selectors";

export function useClassManagementData(activeClassId?: string) {
  const classesRepository = useClassesRepository();
  const classIds = classesRepository.items.map((schoolClass) => schoolClass.id);
  const coursesRepository = useCoursesRepository({
    filters: activeClassId ? { classId: activeClassId } : undefined,
  });
  const teachersRepository = useTeachersRepository();
  const assignmentsRepository = useClassAssignmentsRepository({
    filters: { classIds },
  });

  return {
    classes: selectClassViewModels(classesRepository.items),
    courses: coursesRepository.items,
    teachers: teachersRepository.items,
    assignments: assignmentsRepository.items,
    classesRepository,
    coursesRepository,
    teachersRepository,
    assignmentsRepository,
  };
}
