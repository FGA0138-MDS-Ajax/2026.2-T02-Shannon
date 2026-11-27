import useSWRInfinite from "swr/infinite";
import { request } from "@/services/api";
import { groupKeys } from "@/services/groups-api";
import type { FeedPage } from "@/services/types/groups";

const PAGE_SIZE = 20;

/** Check-ins do grupo, do mais novo ao mais antigo, paginados pelo cursor */
export function useGroupFeed(groupId: string) {
  const { data, error, size, setSize, isValidating, mutate } =
    useSWRInfinite<FeedPage>(
      (index, previous: FeedPage | null) => {
        if (index === 0) return groupKeys.feed(groupId, { limit: PAGE_SIZE });
        if (!previous?.next_cursor) return null;
        return groupKeys.feed(groupId, {
          limit: PAGE_SIZE,
          before: previous.next_cursor,
        });
      },
      request,
      { revalidateFirstPage: true },
    );

  return {
    items: data?.flatMap((page) => page.items),
    error,
    hasMore: data?.[data.length - 1]?.has_more ?? false,
    loadingMore: isValidating && size > (data?.length ?? 0),
    loadMore: () => setSize(size + 1),
    refresh: mutate,
  };
}

export type GroupFeed = ReturnType<typeof useGroupFeed>;
