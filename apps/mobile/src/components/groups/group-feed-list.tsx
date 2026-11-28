import { StyleSheet, View } from "react-native";
import Button from "@/components/button";
import { EmptyState, ErrorBanner, FadeIn, Loading } from "@/components/ui";
import type { GroupFeed } from "@/hooks/useGroupFeed";
import { getErrorMessage } from "@/services/api-errors";
import type { FeedItem, GroupHabit } from "@/services/types/groups";
import { FeedCard } from "./feed-cards";

export interface GroupFeedListProps {
  feed: GroupFeed;
  habitsById: Map<string, GroupHabit>;
  userId?: string;
  onOpen: (item: FeedItem) => void;
}

/** Check-ins recentes do grupo, com "Carregar mais" pelo cursor */
export default function GroupFeedList({
  feed,
  habitsById,
  userId,
  onOpen,
}: GroupFeedListProps) {
  if (feed.error && !feed.items) {
    return (
      <ErrorBanner
        message={getErrorMessage(feed.error)}
        onRetry={() => feed.refresh()}
      />
    );
  }
  if (!feed.items) return <Loading testID="group-feed-loading" />;
  if (feed.items.length === 0) {
    return (
      <EmptyState
        testID="group-feed-empty"
        icon="book-open-check"
        title="Nenhum check-in ainda"
        message="O primeiro check-in do grupo pode ser o seu."
      />
    );
  }

  return (
    <View style={styles.list}>
      {feed.items.map((item, index) => (
        <FadeIn key={item.id} index={index}>
          <FeedCard
            item={item}
            category={habitsById.get(item.habits[0]?.id)?.category}
            isMine={item.author.id === userId}
            onPress={() => onOpen(item)}
            onPhotoExpired={() => feed.refresh()}
          />
        </FadeIn>
      ))}
      {feed.hasMore && (
        <Button
          testID="feed-load-more"
          variant="secondary"
          disabled={feed.loadingMore}
          onPress={feed.loadMore}
        >
          {feed.loadingMore ? "Carregando..." : "Carregar mais"}
        </Button>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 12,
  },
});
