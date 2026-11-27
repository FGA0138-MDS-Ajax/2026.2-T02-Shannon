import { Lucide } from "@react-native-vector-icons/lucide";
import { StyleSheet, Text, View } from "react-native";
import Button from "@/components/button";
import {
  Badge,
  type BadgeTone,
  badgeTones,
  Card,
  InfoRow,
  Sheet,
} from "@/components/ui";
import { describeGoal, describeProgressStatus } from "@/config/goal-labels";
import { habitCategoryLabels } from "@/config/habit-categories";
import { theme } from "@/config/theme";
import { useLastDefined } from "@/hooks/useLastDefined";
import type { FeedItem, GroupHabit } from "@/services/types/groups";
import type { HabitProgress, ProgressStatus } from "@/services/types/habits";
import { formatDateTime } from "@/utils/date";
import {
  type CheckInHabitDetail,
  joinHabitNames,
  periodProgressLabel,
} from "@/utils/group-feed";

// Detalhes de um item da Visão geral do grupo: o check-in do feed ou o
// hábito de uma pessoa. Tudo sai dos dados já carregados, sem nova chamada.
// As folhas guardam o último item para o conteúdo não sumir enquanto descem.

// Mesmas cores do progresso da meta no detalhe do hábito
const statusTones: Record<ProgressStatus, BadgeTone> = {
  completed: "success",
  in_progress: "primary",
  at_risk: "warning",
  failed: "danger",
  ended: "neutral",
};

/** Frequência e categoria numa linha: `"Todo dia · Corrida"` */
function describeHabit(habit: GroupHabit): string {
  const goal = habit.goal ? describeGoal(habit.goal) : "Sem meta";
  return `${goal} · ${habitCategoryLabels[habit.category]}`;
}

export interface CheckInSheetProps {
  /** `null` deixa a folha fechada */
  item: FeedItem | null;
  details: CheckInHabitDetail[];
  isMine: boolean;
  onClose: () => void;
}

export function CheckInSheet({
  item,
  details,
  isMine,
  onClose,
}: CheckInSheetProps) {
  const shown = useLastDefined(item);
  const shownDetails = useLastDefined(item ? details : null) ?? [];

  return (
    <Sheet
      testID="check-in-sheet"
      visible={item !== null}
      eyebrow="CHECK-IN DO GRUPO"
      onClose={onClose}
    >
      {shown && (
        <>
          <Title
            overline={`${isMine ? "Você" : shown.author.username} fez check-in em`}
            title={joinHabitNames(shown.habits)}
            subtitle={`“${shown.title}”`}
          />
          <View style={styles.habits}>
            {shownDetails.map(({ habit, progress }) => (
              <Card key={habit.id} style={styles.habitRow}>
                <View style={styles.habitTexts}>
                  <Text style={styles.habitName}>{habit.name}</Text>
                  <Text style={styles.habitDetail}>{describeHabit(habit)}</Text>
                </View>
                {progress && (
                  <Badge
                    label={periodProgressLabel(progress)}
                    tone={statusTones[progress.status]}
                  />
                )}
              </Card>
            ))}
          </View>
          <Card style={styles.info}>
            <InfoRow
              label="Quando"
              value={formatDateTime(shown.created_at)}
              last
            />
          </Card>
          {shown.description && (
            <Text style={styles.about}>{shown.description}</Text>
          )}
        </>
      )}
    </Sheet>
  );
}

export interface MemberHabitDetail {
  username: string;
  isMine: boolean;
  habit: GroupHabit;
  progress: HabitProgress;
}

export interface MemberHabitSheetProps {
  /** `null` deixa a folha fechada */
  detail: MemberHabitDetail | null;
  onClose: () => void;
  /** Só no hábito da própria pessoa, com o grupo ativo: check-in rápido */
  onCheckIn?: () => void;
  /** Abre o detalhe do hábito do grupo */
  onOpenHabit: () => void;
}

export function MemberHabitSheet({
  detail,
  onClose,
  onCheckIn,
  onOpenHabit,
}: MemberHabitSheetProps) {
  const shown = useLastDefined(detail);

  return (
    <Sheet
      testID="member-habit-sheet"
      visible={detail !== null}
      eyebrow="HÁBITO DO GRUPO"
      onClose={onClose}
    >
      {shown && (
        <>
          <Title
            overline={
              shown.isMine ? "Seu hábito" : `Hábito de ${shown.username}`
            }
            title={shown.habit.name}
            subtitle={shown.habit.description}
          />
          <GoalBox progress={shown.progress} />
          <Card style={styles.info}>
            <InfoRow
              label="Frequência"
              value={
                shown.habit.goal ? describeGoal(shown.habit.goal) : "Sem meta"
              }
            />
            <InfoRow
              label="Categoria"
              value={habitCategoryLabels[shown.habit.category]}
              last
            />
          </Card>
          <View style={styles.actions}>
            {onCheckIn && (
              <Button
                testID="member-habit-check-in"
                width="full"
                onPress={onCheckIn}
              >
                Fazer check-in
              </Button>
            )}
            <Button
              testID="member-habit-open"
              variant="outline"
              width="full"
              onPress={onOpenHabit}
            >
              Ver hábito
            </Button>
          </View>
        </>
      )}
    </Sheet>
  );
}

function Title({
  overline,
  title,
  subtitle,
}: {
  overline: string;
  title: string;
  subtitle?: string | null;
}) {
  return (
    <View style={styles.titles}>
      <Text style={styles.overline}>{overline}</Text>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

/** Quadro da meta do período: situação e dias feitos */
function GoalBox({ progress }: { progress: HabitProgress }) {
  const done = progress.status === "completed";
  const colors = badgeTones[statusTones[progress.status]];
  return (
    <View style={[styles.goal, { backgroundColor: colors.background }]}>
      <View style={styles.goalStatus}>
        <Lucide name={done ? "check" : "clock"} size={14} color={colors.text} />
        <Text style={[styles.goalLabel, { color: colors.text }]}>
          {done ? "Meta cumprida" : describeProgressStatus(progress)}
        </Text>
      </View>
      <Text style={styles.goalValue}>{periodProgressLabel(progress)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  titles: {
    gap: 4,
    marginTop: 4,
  },
  overline: {
    fontFamily: theme.font.regular,
    fontSize: 13,
    color: theme.colors.muted,
  },
  title: {
    fontFamily: theme.font.bold,
    fontSize: 22,
    color: theme.colors.text,
  },
  subtitle: {
    fontFamily: theme.font.regular,
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.textSecondary,
  },
  habits: {
    marginTop: 16,
    gap: 8,
  },
  habitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  habitTexts: {
    flex: 1,
    gap: 2,
  },
  habitName: {
    fontFamily: theme.font.semiBold,
    fontSize: 15,
    color: theme.colors.text,
  },
  habitDetail: {
    fontFamily: theme.font.regular,
    fontSize: 12,
    color: theme.colors.muted,
  },
  goal: {
    marginTop: 16,
    gap: 6,
    padding: 16,
    borderRadius: theme.radius.lg,
  },
  goalStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  goalLabel: {
    flexShrink: 1,
    fontFamily: theme.font.semiBold,
    fontSize: 13,
  },
  goalValue: {
    fontFamily: theme.font.bold,
    fontSize: 22,
    color: theme.colors.text,
  },
  info: {
    marginTop: 12,
    paddingVertical: 4,
  },
  about: {
    marginTop: 12,
    fontFamily: theme.font.regular,
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.textSecondary,
  },
  actions: {
    marginTop: 16,
    gap: 8,
  },
});
