import { router } from "expo-router";
import { useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import useSWR from "swr";
import Button from "@/components/button";
import Calendar from "@/components/calendar";
import CheckInItem from "@/components/check-in-item";
import {
  EmptyState,
  ErrorBanner,
  FloatingAction,
  Loading,
  Screen,
  ScreenHeader,
  SectionHeader,
} from "@/components/ui";
import { theme } from "@/config/theme";
import { useRefreshOnFocus } from "@/hooks/useRefreshOnFocus";
import { getErrorMessage } from "@/services/api-errors";
import { checkInKeys, listUserCheckIns } from "@/services/check-ins-api";
import type { CheckIn, CheckInsPage } from "@/services/types/habits";
import {
  formatDate,
  parseApiDate,
  startOfToday,
  toApiDate,
} from "@/utils/date";

// Os 100 check-ins mais recentes marcam os dias no calendário. A API pagina
// por quantidade, não por mês: meses antigos com mais registros ficam vazios.
const LIST_PARAMS = { page: 1, page_size: 100 };

/** Junta as páginas `[{ "2026-11-25": [...] }]` num mapa data → check-ins. */
function groupByDate(page?: CheckInsPage): Record<string, CheckIn[]> {
  return Object.assign({}, ...(page?.items ?? []));
}

export default function CheckInScreen() {
  const todayStr = useMemo(() => toApiDate(startOfToday()), []);
  const [selectedDate, setSelectedDate] = useState(todayStr);

  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate: refreshCheckIns,
  } = useSWR<CheckInsPage>(checkInKeys.list(LIST_PARAMS), () =>
    listUserCheckIns(LIST_PARAMS),
  );

  useRefreshOnFocus(refreshCheckIns);

  const checkInsByDate = useMemo(() => groupByDate(data), [data]);
  const selectedCheckIns = checkInsByDate[selectedDate] ?? [];
  const formattedDate = formatDate(parseApiDate(selectedDate));
  const dateLabel =
    selectedDate === todayStr ? `hoje, ${formattedDate}` : formattedDate;

  const renderList = () => {
    if (isLoading && !data) return <Loading />;

    if (selectedCheckIns.length === 0) {
      return (
        <EmptyState
          testID="empty-check-ins"
          icon="calendar"
          title="Nenhum check-in neste dia"
          message="Toque no botão abaixo para registrar seu check-in e manter seus hábitos em dia!"
        />
      );
    }

    return (
      <View style={styles.list} testID="selected-day-check-ins">
        {selectedCheckIns.map((checkIn) => (
          <CheckInItem
            key={checkIn.id}
            checkIn={checkIn}
            onPress={() => router.push(`/check-ins/${checkIn.id}`)}
            onPhotoExpired={() => refreshCheckIns()}
          />
        ))}
      </View>
    );
  };

  return (
    <Screen>
      <ScreenHeader title="Meus check-ins" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={isValidating && !isLoading}
            onRefresh={() => {
              refreshCheckIns();
            }}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      >
        <Calendar
          checkInDates={Object.keys(checkInsByDate)}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
        />

        {error && (
          <View style={styles.error}>
            <ErrorBanner
              message={getErrorMessage(error)}
              onRetry={() => refreshCheckIns()}
            />
          </View>
        )}

        <View style={styles.section}>
          <SectionHeader
            title={`Check-ins de ${dateLabel}`}
            count={
              selectedCheckIns.length > 0 ? selectedCheckIns.length : undefined
            }
          />
          {renderList()}
        </View>
      </ScrollView>

      <FloatingAction>
        <Button
          testID="new-check-in-button"
          width="full"
          onPress={() => router.push("/check-ins/create")}
        >
          Check-in
        </Button>
      </FloatingAction>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 100,
  },
  error: {
    marginTop: 12,
  },
  section: {
    marginTop: 24,
  },
  list: {
    gap: 12,
  },
});
