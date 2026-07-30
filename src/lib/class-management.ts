import {
  useClassAssignmentsRepository,
  useClassesRepository,
  useCoursesRepository,
  useTeachersRepository,
} from "@/lib/mock-queries";
import { selectClassViewModels } from "@/lib/class-management-selectors";

export * from "@/lib/class-management-selectors";

export function useClassManagementData() {
  const classesRepository = useClassesRepository();
  const coursesRepository = useCoursesRepository();
  const teachersRepository = useTeachersRepository();
  const assignmentsRepository = useClassAssignmentsRepository();

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
