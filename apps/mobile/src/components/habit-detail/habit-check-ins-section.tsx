import { router } from "expo-router";
import { StyleSheet, Text } from "react-native";
import useSWR from "swr";
import { Card, ErrorBanner, Loading, Section } from "@/components/ui";
import { theme } from "@/config/theme";
import { useRefreshOnFocus } from "@/hooks/useRefreshOnFocus";
import { request } from "@/services/api";
import { getErrorMessage } from "@/services/api-errors";
import { habitKeys } from "@/services/habits-api";
import { useSession } from "@/hooks/useSession";
import type { CheckIn } from "@/services/types/habits";
import { formatDateTime } from "@/utils/date";
import { formatDuration } from "@/utils/duration";

// Histórico de check-ins do hábito, do mais recente ao mais antigo
export default function HabitCheckInsSection({
  habitId,
  members,
}: {
  habitId: string;
  /** Integrantes do grupo, para mostrar o autor (hábito de grupo) */
  members?: { user_id: string; username: string }[];
}) {
  const {
    data: checkIns,
    error,
    mutate,
  } = useSWR<CheckIn[]>(habitKeys.checkIns(habitId), request);

  // Check-ins e metas mudam em outras telas: recarrega ao voltar
  useRefreshOnFocus(mutate);
  const { user } = useSession();

  const renderBody = () => {
    if (error) {
      return (
        <ErrorBanner
          message={getErrorMessage(error)}
          onRetry={() => mutate()}
        />
      );
    }
    if (!checkIns) return <Loading />;
    if (checkIns.length === 0) {
      return (
        <Text style={styles.empty}>Nenhum check-in registrado ainda.</Text>
      );
    }
    return checkIns.map((checkIn) => (
      <Card
        key={checkIn.id}
        testID="check-in-item"
        onPress={() => router.push(`/check-ins/${checkIn.id}`)}
        style={styles.item}
      >
        <Text style={styles.title}>{checkIn.title}</Text>
        <Text style={styles.details}>
          {formatDateTime(checkIn.created_at)}
          {checkIn.duration ? ` · ${formatDuration(checkIn.duration)}` : ""}
        </Text>
        {/* Hábito de grupo: mostra o autor, inclusive de outros membros */}
        <Text style={styles.author}>
          por{" "}
          {checkIn.user_id === user?.id
            ? "Você"
            : (members?.find((m) => m.user_id === checkIn.user_id)?.username ??
              checkIn.user_id)}
        </Text>
      </Card>
    ));
  };

  return <Section title="Check-ins">{renderBody()}</Section>;
}

const styles = StyleSheet.create({
  empty: {
    fontFamily: theme.font.regular,
    fontSize: 15,
    color: theme.colors.label,
  },
  item: {
    gap: 2,
  },
  author: {
    fontFamily: theme.font.regular,
    fontSize: 12,
    color: theme.colors.muted,
  },
  title: {
    fontFamily: theme.font.semiBold,
    fontSize: 15,
    color: theme.colors.text,
  },
  details: {
    fontFamily: theme.font.regular,
    fontSize: 13,
    color: theme.colors.muted,
  },
});
