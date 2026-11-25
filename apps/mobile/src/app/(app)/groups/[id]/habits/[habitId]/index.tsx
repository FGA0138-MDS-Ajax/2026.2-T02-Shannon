import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import useSWR from "swr";
import BackButton from "@/components/back-button";
import Button from "@/components/button";
import { Badge } from "@/components/group-row";
import MemberHabitProgress from "@/components/member-habit-progress";
import { palette } from "@/components/statistics/palette";
import { describeGoal } from "@/config/goal-labels";
import { habitCategoryLabels } from "@/config/habit-categories";
import { theme } from "@/config/theme";
import { useSession } from "@/hooks/useSession";
import { getErrorMessage } from "@/services/api-errors";
import { getGroupHabit, getGroupHabitStats } from "@/services/groups-api";

export default function GroupHabitScreen() {
  const { id, habitId } = useLocalSearchParams<{
    id: string;
    habitId: string;
  }>();
  const { user } = useSession();

  const {
    data: habit,
    error,
    mutate: refreshHabit,
  } = useSWR(`/groups/${id}/habits/${habitId}`, () =>
    getGroupHabit(id, habitId),
  );
  const { data: stats, mutate: refreshStats } = useSWR(
    `/groups/${id}/habits/${habitId}/stats`,
    () => getGroupHabitStats(id, habitId),
  );

  useFocusEffect(
    useCallback(() => {
      refreshHabit();
      refreshStats();
    }, [refreshHabit, refreshStats]),
  );

  const renderContent = () => {
    if (!habit) {
      return (
        <View style={styles.centered}>
          {error ? (
            <>
              <Text style={styles.message}>{getErrorMessage(error)}</Text>
              <Button variant="secondary" onPress={() => refreshHabit()}>
                Tentar novamente
              </Button>
            </>
          ) : (
            <ActivityIndicator size="large" color={theme.colors.primary} />
          )}
        </View>
      );
    }

    return (
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{habit.name}</Text>
          {habit.status === "finished" && <Badge label="Encerrado" />}
        </View>
        <Text style={styles.detail}>{describeGoal(habit.goal)}</Text>
        <Text style={styles.detail}>{habitCategoryLabels[habit.category]}</Text>
        {habit.description && (
          <Text style={styles.description}>{habit.description}</Text>
        )}

        <Text style={styles.sectionTitle}>Como cada um está</Text>
        {stats ? (
          stats.members.map((member) => (
            <MemberHabitProgress
              key={member.user.id}
              stats={member}
              isMe={member.user.id === user?.id}
            />
          ))
        ) : (
          <ActivityIndicator color={theme.colors.primary} />
        )}
      </ScrollView>
    );
  };

  return (
    <SafeAreaView
      edges={{ top: "additive", bottom: "off" }}
      style={styles.container}
    >
      <BackButton />
      {renderContent()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    backgroundColor: theme.colors.gray,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  message: {
    fontFamily: theme.font.regular,
    fontSize: 14,
    color: palette.inkSoft,
    textAlign: "center",
  },
  scroll: {
    paddingBottom: 32,
    gap: 2,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  title: {
    flexShrink: 1,
    fontFamily: theme.font.bold,
    fontSize: 28,
    color: palette.ink,
  },
  detail: {
    fontFamily: theme.font.regular,
    fontSize: 14,
    color: palette.inkSoft,
  },
  description: {
    marginTop: 12,
    fontFamily: theme.font.regular,
    fontSize: 16,
    lineHeight: 24,
    color: palette.ink,
  },
  sectionTitle: {
    marginTop: 24,
    marginBottom: 4,
    fontFamily: theme.font.semiBold,
    fontSize: 20,
    color: palette.ink,
  },
});
