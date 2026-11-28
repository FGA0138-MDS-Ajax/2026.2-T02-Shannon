import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Badge, Card, InfoRow, Section } from "@/components/ui";
import { describeGoal } from "@/config/goal-labels";
import { habitCategoryLabels } from "@/config/habit-categories";
import { theme } from "@/config/theme";
import type { Habit } from "@/services/types/habits";
import { formatDate, parseApiDate } from "@/utils/date";

const formatApiDate = (value: string) => formatDate(parseApiDate(value));

/** Grupo do hábito, ou se o hábito pessoal é público ou privado */
function describeHabitOwner(habit: Habit): string {
  if (habit.group) return `Hábito do grupo ${habit.group.name}`;
  return habit.is_public ? "Público" : "Privado";
}

export interface HabitSummaryProps {
  habit: Habit;
  /** Mostra a meta nas informações (o hábito de grupo não tem seção de meta) */
  showGoal?: boolean;
  /** Conteúdo logo abaixo do resumo (ex.: botão "Ver no grupo") */
  children?: ReactNode;
}

// Topo das telas de detalhe de hábito: nome, situação, descrição e datas
export default function HabitSummary({
  habit,
  showGoal = false,
  children,
}: HabitSummaryProps) {
  const isFinished = habit.status === "finished";
  const rows = [
    showGoal && habit.goal
      ? { label: "Meta", value: describeGoal(habit.goal) }
      : null,
    { label: "Criado em", value: formatApiDate(habit.created_at) },
    habit.target_end_date
      ? {
          label: "Data final prevista",
          value: formatApiDate(habit.target_end_date),
        }
      : null,
    habit.finished_at
      ? { label: "Encerrado em", value: formatApiDate(habit.finished_at) }
      : null,
  ].filter((row) => row !== null);

  return (
    <View>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{habit.name}</Text>
        <Badge
          label={isFinished ? "Encerrado" : "Ativo"}
          tone={isFinished ? "neutral" : "primary"}
        />
      </View>
      <Text style={styles.details}>
        {habitCategoryLabels[habit.category]} · {describeHabitOwner(habit)}
      </Text>

      {children}

      {habit.description && (
        <Section title="Descrição">
          <Text style={styles.description}>{habit.description}</Text>
        </Section>
      )}

      <Card style={styles.info}>
        {rows.map((row, index) => (
          <InfoRow
            key={row.label}
            label={row.label}
            value={row.value}
            last={index === rows.length - 1}
          />
        ))}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 8,
    marginBottom: 4,
  },
  title: {
    flex: 1,
    fontFamily: theme.font.bold,
    fontSize: 26,
    color: theme.colors.text,
  },
  details: {
    fontFamily: theme.font.regular,
    fontSize: 15,
    color: theme.colors.muted,
  },
  description: {
    fontFamily: theme.font.regular,
    fontSize: 15,
    color: theme.colors.label,
    lineHeight: 22,
  },
  info: {
    marginTop: 24,
    paddingVertical: 4,
  },
});
