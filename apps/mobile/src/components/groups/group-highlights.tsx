import { Lucide } from "@react-native-vector-icons/lucide";
import type { ComponentProps } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Card } from "@/components/ui";
import { formatStreak } from "@/config/goal-labels";
import { theme } from "@/config/theme";
import type { GroupStatistics } from "@/services/types/groups";

type IconName = ComponentProps<typeof Lucide>["name"];

// Destaques do grupo, um por linha: rótulo, quem e em qual hábito
export default function GroupHighlights({ stats }: { stats: GroupStatistics }) {
  const { most_consistent: consistent, best_record: record } = stats;

  return (
    <Card testID="group-highlights" style={styles.listCard}>
      <HighlightRow
        testID="stat-check-ins-7-days"
        icon="calendar-check"
        label="Check-ins em 7 dias"
        value={String(stats.check_ins_last_7_days)}
        detail="Somando todos os integrantes"
      />
      <HighlightRow
        testID="stat-most-consistent"
        icon="flame"
        label="Mais constante"
        value={consistent ? `@${consistent.user.username}` : "—"}
        detail={
          consistent
            ? `${formatStreak(consistent.consistent_days, "day")} em ${consistent.habit.name}`
            : "Faça check-in para pontuar"
        }
      />
      <HighlightRow
        testID="stat-best-record"
        icon="trophy"
        label="Maior recorde"
        value={record ? `@${record.user.username}` : "—"}
        detail={
          record
            ? `${formatStreak(record.best_streak, record.unit)} em ${record.habit.name}`
            : "Nenhuma sequência registrada"
        }
        last
      />
    </Card>
  );
}

interface HighlightRowProps {
  icon: IconName;
  label: string;
  value: string;
  detail: string;
  last?: boolean;
  testID?: string;
}

function HighlightRow({
  icon,
  label,
  value,
  detail,
  last = false,
  testID,
}: HighlightRowProps) {
  return (
    <View testID={testID} style={[styles.row, last && styles.rowLast]}>
      <View style={styles.highlightIcon}>
        <Lucide name={icon} size={16} color={theme.colors.primaryDark} />
      </View>
      <View style={styles.highlightInfo}>
        <Text style={styles.highlightLabel}>{label}</Text>
        <Text style={styles.highlightDetail}>{detail}</Text>
      </View>
      <Text style={styles.highlightValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  listCard: {
    paddingBottom: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  highlightIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: theme.colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  highlightInfo: {
    flex: 1,
    gap: 2,
  },
  highlightLabel: {
    fontFamily: theme.font.semiBold,
    fontSize: 14,
    color: theme.colors.text,
  },
  highlightDetail: {
    fontFamily: theme.font.regular,
    fontSize: 12,
    color: theme.colors.muted,
  },
  highlightValue: {
    maxWidth: "40%",
    fontFamily: theme.font.bold,
    fontSize: 15,
    color: theme.colors.text,
  },
});
