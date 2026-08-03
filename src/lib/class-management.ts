import {
  useClassAssignmentsRepository,
  useClassesRepository,
  useCoursesRepository,
  useMajorsRepository,
  useTeachersRepository,
} from "@/lib/mock-queries";
import { selectClassViewModels, selectMajorOptions } from "@/lib/class-management-selectors";

export * from "@/lib/class-management-selectors";

export function useClassManagementData(activeClassId?: string) {
  const classesRepository = useClassesRepository();
  const majorsRepository = useMajorsRepository();
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
    classes: selectClassViewModels(classesRepository.items, majorsRepository.data ?? []),
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
  };
}
