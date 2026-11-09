import { Lucide } from "@react-native-vector-icons/lucide";
import { type Href, router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import useSWR from "swr";
import Button from "@/components/button";
import Calendar from "@/components/calendar";
import { theme } from "@/config/theme";
import { getErrorMessage } from "@/services/api-errors";
import { listUserCheckIns } from "@/services/check-ins-api";
import type { CheckIn, CheckInsPage } from "@/services/types/habits";
import {
  formatDate,
  parseApiDate,
  startOfToday,
  toApiDate,
} from "@/utils/date";
import { formatDuration } from "@/utils/duration";

export default function CheckInScreen() {
  const todayStr = useMemo(() => toApiDate(startOfToday()), []);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    data,
    isLoading,
    isValidating,
    mutate: refreshCheckIns,
  } = useSWR<CheckInsPage>(
    "/check-ins?page=1&page_size=100",
    () => listUserCheckIns({ page: 1, page_size: 100 }),
    {
      onError: (err) => setErrorMessage(getErrorMessage(err)),
      onSuccess: () => setErrorMessage(null),
    },
  );

  useFocusEffect(
    useCallback(() => {
      refreshCheckIns();
    }, [refreshCheckIns]),
  );

  // Mapeia data "YYYY-MM-DD" para lista de check-ins correspondentes
  const checkInsByDate = useMemo(() => {
    const map: Record<string, CheckIn[]> = {};
    if (!data?.items) return map;
    for (const group of data.items) {
      for (const [dateKey, checkIns] of Object.entries(group)) {
        map[dateKey] = checkIns;
      }
    }
    return map;
  }, [data]);

  const checkInDates = useMemo(() => {
    return Object.keys(checkInsByDate);
  }, [checkInsByDate]);

  const selectedCheckIns = useMemo(() => {
    return checkInsByDate[selectedDate] ?? [];
  }, [checkInsByDate, selectedDate]);

  const formattedSelectedDate = useMemo(() => {
    try {
      const parsed = parseApiDate(selectedDate);
      const isToday = selectedDate === todayStr;
      const formatted = formatDate(parsed);
      return isToday ? `Hoje, ${formatted}` : formatted;
    } catch {
      return selectedDate;
    }
  }, [selectedDate, todayStr]);

  const handleOpenCheckIn = (id: string) => {
    router.push(`/check-ins/${id}` as Href);
  };

  const handleCreateCheckIn = () => {
    router.push("/check-ins/create" as Href);
  };

  const renderCheckInItem = (item: CheckIn) => {
    const durationText = item.duration ? formatDuration(item.duration) : null;

    let timeText = "";
    if (item.created_at) {
      const date = new Date(item.created_at);
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      timeText = `${hours}:${minutes}`;
    }

    return (
      <Pressable
        key={item.id}
        testID={`check-in-item-${item.id}`}
        onPress={() => handleOpenCheckIn(item.id)}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        accessibilityRole="button"
        accessibilityLabel={`Check-in ${item.title}`}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Lucide name="chevron-right" size={18} color="#A8A29E" />
        </View>

        {!!item.description && (
          <Text style={styles.cardDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}

        <View style={styles.cardMetaRow}>
          {!!timeText && (
            <View style={styles.metaItem}>
              <Lucide name="clock" size={14} color="#78716C" />
              <Text style={styles.metaText}>{timeText}</Text>
            </View>
          )}

          {!!durationText && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{durationText}</Text>
            </View>
          )}

          <View style={styles.metaHabits}>
            <Text style={styles.metaText}>
              {item.habit_ids.length}{" "}
              {item.habit_ids.length === 1 ? "hábito" : "hábitos"}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Meus check-ins</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isValidating && !isLoading}
            onRefresh={refreshCheckIns}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      >
        <Calendar
          checkInDates={checkInDates}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
        />

        {errorMessage && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{errorMessage}</Text>
            <Button
              variant="secondary"
              onPress={() => refreshCheckIns()}
              style={styles.retryButton}
            >
              Tentar novamente
            </Button>
          </View>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Check-ins de {formattedSelectedDate}
          </Text>
          {selectedCheckIns.length > 0 && (
            <View style={styles.counterBadge}>
              <Text style={styles.counterText}>{selectedCheckIns.length}</Text>
            </View>
          )}
        </View>

        {isLoading && !data ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : selectedCheckIns.length > 0 ? (
          <View style={styles.checkInsList} testID="selected-day-check-ins">
            {selectedCheckIns.map(renderCheckInItem)}
          </View>
        ) : (
          <View style={styles.emptyContainer} testID="empty-check-ins">
            <Lucide name="calendar" size={36} color="#A8A29E" />
            <Text style={styles.emptyTitle}>Nenhum check-in neste dia</Text>
            <Text style={styles.emptySubtitle}>
              Toque no botão abaixo para registrar seu check-in e manter seus
              hábitos em dia!
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.action}>
        <Button
          testID="new-check-in-button"
          width="full"
          onPress={handleCreateCheckIn}
        >
          Check-in
        </Button>
      </View>
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
  header: {
    marginTop: 16,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontFamily: theme.font.bold,
    fontSize: 28,
    color: "#1C1917",
  },
  scrollContent: {
    paddingBottom: 100,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: theme.font.bold,
    fontSize: 18,
    color: "#1C1917",
  },
  counterBadge: {
    backgroundColor: "#E7E2DE",
    borderRadius: 9999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  counterText: {
    fontFamily: theme.font.medium,
    fontSize: 12,
    color: "#44403C",
  },
  checkInsList: {
    gap: 12,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E7E2DE",
    padding: 16,
    gap: 8,
  },
  cardPressed: {
    opacity: 0.8,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTitle: {
    flex: 1,
    fontFamily: theme.font.bold,
    fontSize: 16,
    color: "#1C1917",
    marginRight: 8,
  },
  cardDescription: {
    fontFamily: theme.font.regular,
    fontSize: 14,
    color: "#57534E",
    lineHeight: 20,
  },
  cardMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 4,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaHabits: {
    marginLeft: "auto",
  },
  metaText: {
    fontFamily: theme.font.regular,
    fontSize: 13,
    color: "#78716C",
  },
  badge: {
    backgroundColor: theme.colors.gray100,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    fontFamily: theme.font.medium,
    fontSize: 12,
    color: theme.colors.primaryDark,
  },
  loadingContainer: {
    paddingVertical: 32,
    alignItems: "center",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E7E2DE",
    gap: 8,
  },
  emptyTitle: {
    fontFamily: theme.font.semiBold,
    fontSize: 16,
    color: "#1C1917",
    marginTop: 4,
  },
  emptySubtitle: {
    fontFamily: theme.font.regular,
    fontSize: 14,
    color: "#78716C",
    textAlign: "center",
    lineHeight: 20,
  },
  errorBanner: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    gap: 8,
  },
  errorText: {
    fontFamily: theme.font.regular,
    fontSize: 14,
    color: "#B91C1C",
    textAlign: "center",
  },
  retryButton: {
    alignSelf: "center",
  },
  action: {
    zIndex: 1,
    position: "absolute",
    bottom: 24,
    left: 24,
    right: 24,
  },
});
