export interface QueryCachePublisher {
  setQueryData(queryKey: readonly unknown[], value: unknown): unknown;
}

export function publishQuerySnapshot<T>(
  queryClient: QueryCachePublisher,
  queryKey: readonly unknown[],
  snapshot: T,
) {
  queryClient.setQueryData(queryKey, snapshot);
}
