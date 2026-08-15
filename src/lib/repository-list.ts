import type { EntityRepository } from "@/lib/repositories/contracts";

export async function listAllEntities<T extends { id: string }>(
  repository: Pick<EntityRepository<T>, "list">,
  signal?: AbortSignal,
) {
  const pageSize = 100;
  const first = await repository.list({ page: 1, pageSize, signal });
  const pages = Math.ceil(first.total / pageSize);
  if (pages <= 1) return first.items;
  const remaining = await Promise.all(
    Array.from({ length: pages - 1 }, (_, index) =>
      repository.list({ page: index + 2, pageSize, signal }),
    ),
  );
  return [...first.items, ...remaining.flatMap((page) => page.items)];
}
