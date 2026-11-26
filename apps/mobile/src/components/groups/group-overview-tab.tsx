import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import QuickCheckInSheet, {
  type QuickCheckInHabit,
} from "@/components/quick-check-in";
import { ErrorBanner, FadeIn, Loading, Section } from "@/components/ui";
import { useGroupFeed } from "@/hooks/useGroupFeed";
import type { GroupPeriodState } from "@/hooks/useGroupPeriod";
import { useRefreshOnFocus } from "@/hooks/useRefreshOnFocus";
import { getErrorMessage } from "@/services/api-errors";
import type {
  FeedItem,
  GroupDetail,
  GroupHabit,
} from "@/services/types/groups";
import { checkInHabitDetails, latestCheckIn } from "@/utils/group-feed";
import type { MemberHabitPeriod } from "@/utils/group-period";
import { MemberHabitCard } from "./feed-cards";
import {
  CheckInSheet,
  type MemberHabitDetail,
  MemberHabitSheet,
} from "./feed-sheets";
import GroupFeedList from "./group-feed-list";

// Espera a folha anterior sumir antes de abrir a do check-in rápido: no iOS
// um modal não abre enquanto o outro ainda está saindo
const SHEET_SWAP_DELAY = 300;

export interface GroupOverviewTabProps {
  group: GroupDetail;
  board: GroupPeriodState;
  userId?: string;
  selectedMemberId: string | null;
  onSelectMember: (userId: string | null) => void;
}

/**
 * Folha da Visão geral: os check-ins recentes ou, com uma pessoa escolhida
 * na roda (no cabeçalho), os hábitos dela.
 */
export default function GroupOverviewTab({
  group,
  board,
  userId,
  selectedMemberId,
  onSelectMember,
}: GroupOverviewTabProps) {
  const feed = useGroupFeed(group.id);
  useRefreshOnFocus(feed.refresh);

  const [openCheckIn, setOpenCheckIn] = useState<FeedItem | null>(null);
  const [openHabit, setOpenHabit] = useState<MemberHabitDetail | null>(null);
  const [quickHabit, setQuickHabit] = useState<QuickCheckInHabit | null>(null);
  const swapTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(swapTimer.current), []);

  const habitsById = useMemo(
    () => new Map((board.habits ?? []).map((habit) => [habit.id, habit])),
    [board.habits],
  );

  const { period } = board;
  if (board.error && !period) {
    return (
      <ErrorBanner
        message={getErrorMessage(board.error)}
        onRetry={board.refresh}
      />
    );
  }
  if (!period) return <Loading testID="group-period-loading" />;

  const selected = period.members.find(
    (member) => member.user.id === selectedMemberId,
  );

  // Meta cumprida com o check-in no feed: abre o check-in. Senão, o hábito.
  const openMemberHabit = (habit: MemberHabitPeriod) => {
    if (!selected) return;
    const checkIn =
      habit.done && feed.items
        ? latestCheckIn(feed.items, selected.user.id, habit.habitId)
        : undefined;
    if (checkIn) {
      setOpenCheckIn(checkIn);
      return;
    }
    const groupHabit = habitsById.get(habit.habitId);
    if (groupHabit) {
      setOpenHabit({
        username: selected.user.username,
        isMine: selected.user.id === userId,
        habit: groupHabit,
        progress: habit.progress,
      });
    }
  };

  const startQuickCheckIn = (habit: GroupHabit) => {
    setOpenHabit(null);
    swapTimer.current = setTimeout(
      () => setQuickHabit(habit),
      SHEET_SWAP_DELAY,
    );
  };

  const isMe = selected?.user.id === userId;
  const canCheckIn = group.status === "active" && isMe;

  return (
    <View>
      {selected ? (
        <Section
          style={styles.first}
          title={isMe ? "Seus hábitos" : `Hábitos de ${selected.user.username}`}
          count={`${selected.done}/${selected.total}`}
          actionLabel="Ver grupo"
          onAction={() => onSelectMember(null)}
        >
          {/* Pendentes primeiro: é o que ainda dá para fazer */}
          {[...selected.habits]
            .sort((a, b) => Number(a.done) - Number(b.done))
            .map((habit, index) => (
              <FadeIn key={habit.habitId} index={index}>
                <MemberHabitCard
                  testID={`member-habit-${habit.habitId}`}
                  name={habit.name}
                  description={
                    habitsById.get(habit.habitId)?.description ?? null
                  }
                  done={habit.done}
                  onPress={() => openMemberHabit(habit)}
                />
              </FadeIn>
            ))}
        </Section>
      ) : (
        <Section style={styles.first} title="Check-ins recentes">
          <GroupFeedList
            feed={feed}
            habitsById={habitsById}
            userId={userId}
            onOpen={setOpenCheckIn}
          />
        </Section>
      )}

      <CheckInSheet
        item={openCheckIn}
        isMine={openCheckIn?.author.id === userId}
        details={
          openCheckIn
            ? checkInHabitDetails(openCheckIn, habitsById, period.members)
            : []
        }
        onClose={() => setOpenCheckIn(null)}
      />
      <MemberHabitSheet
        detail={openHabit}
        onClose={() => setOpenHabit(null)}
        onOpenHabit={() => {
          if (!openHabit) return;
          setOpenHabit(null);
          router.push(`/groups/${group.id}/habits/${openHabit.habit.id}`);
        }}
        onCheckIn={
          canCheckIn && openHabit
            ? () => startQuickCheckIn(openHabit.habit)
            : undefined
        }
      />
      <QuickCheckInSheet
        habit={quickHabit}
        userId={userId}
        onClose={() => setQuickHabit(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // A folha já tem margem em cima
  first: {
    marginTop: 0,
  },
});
