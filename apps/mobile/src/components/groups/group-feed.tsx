import { StyleSheet, Text, View } from "react-native";
import useSWRInfinite from "swr/infinite";
import Button from "@/components/button";
import {
  Avatar,
  Badge,
  Card,
  EmptyState,
  ErrorBanner,
  Loading,
} from "@/components/ui";
import { theme } from "@/config/theme";
import { useRefreshOnFocus } from "@/hooks/useRefreshOnFocus";
import { useSession } from "@/hooks/useSession";
import { request } from "@/services/api";
import { getErrorMessage } from "@/services/api-errors";
import { groupKeys } from "@/services/groups-api";
import type { FeedItem, FeedPage } from "@/services/types/groups";
import { formatDateTime } from "@/utils/date";

const PAGE_SIZE = 20;

// Check-ins do grupo, do mais novo ao mais antigo, paginados pelo cursor
export default function GroupFeed({ groupId }: { groupId: string }) {
  const { user } = useSession();
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

  useRefreshOnFocus(mutate);

  const items = data?.flatMap((page) => page.items) ?? [];
  const hasMore = data?.[data.length - 1]?.has_more ?? false;
  const isLoadingMore = isValidating && size > (data?.length ?? 0);

  if (error && !data) {
    return (
      <ErrorBanner message={getErrorMessage(error)} onRetry={() => mutate()} />
    );
  }
  if (!data) return <Loading testID="group-feed-loading" />;
  if (items.length === 0) {
    return (
      <EmptyState
        testID="group-feed-empty"
        icon="book-open-check"
        title="Nenhum check-in ainda"
        message="Os check-ins nos hábitos do grupo aparecem aqui."
      />
    );
  }

  return (
    <View style={styles.list}>
      {items.map((item) => (
        <FeedCard
          key={item.id}
          item={item}
          isMine={item.author.id === user?.id}
        />
      ))}
      {hasMore && (
        <Button
          testID="feed-load-more"
          variant="secondary"
          disabled={isLoadingMore}
          onPress={() => setSize(size + 1)}
        >
          {isLoadingMore ? "Carregando..." : "Carregar mais"}
        </Button>
      )}
    </View>
  );
}

function FeedCard({ item, isMine }: { item: FeedItem; isMine: boolean }) {
  return (
    <Card testID={`feed-item-${item.id}`} style={styles.card}>
      <View style={styles.authorRow}>
        <Avatar name={item.author.username} size={32} highlighted={isMine} />
        <View style={styles.authorInfo}>
          <Text style={styles.author}>
            {isMine ? "Você" : `@${item.author.username}`}
          </Text>
          <Text style={styles.time}>{formatDateTime(item.created_at)}</Text>
        </View>
      </View>
      <Text style={styles.title}>{item.title}</Text>
      {item.description && (
        <Text style={styles.description} numberOfLines={3}>
          {item.description}
        </Text>
      )}
      <View style={styles.habits}>
        {item.habits.map((habit) => (
          <Badge key={habit.id} label={habit.name} tone="primary" />
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 12,
  },
  card: {
    gap: 8,
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  authorInfo: {
    flex: 1,
  },
  author: {
    fontFamily: theme.font.semiBold,
    fontSize: 14,
    color: theme.colors.text,
  },
  time: {
    fontFamily: theme.font.regular,
    fontSize: 12,
    color: theme.colors.muted,
  },
  title: {
    fontFamily: theme.font.bold,
    fontSize: 16,
    color: theme.colors.text,
  },
  description: {
    fontFamily: theme.font.regular,
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  habits: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
});
