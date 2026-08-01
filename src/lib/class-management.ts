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
  const teachersRepository = useTeachersRepository({}, { includeAvailability: true });
  const assignmentsRepository = useClassAssignmentsRepository({
    filters: { classIds },
  });
  const activeClassAssignmentsRepository = useClassAssignmentsRepository({
    filters: activeClassId ? { classId: activeClassId } : { classIds: [] },
  });

  return {
    classes: selectClassViewModels(classesRepository.items),
    courses: coursesRepository.items,
    teachers: teachersRepository.items,
    assignments: assignmentsRepository.items,
    activeClassAssignments: activeClassAssignmentsRepository.items,
    classesRepository,
    coursesRepository,
    teachersRepository,
    assignmentsRepository,
    activeClassAssignmentsRepository,
  };
}
