import { describeGoal } from "@/config/goal-labels";
import { habitCategoryLabels } from "@/config/habit-categories";
import type { GroupHabit, UserRef } from "@/services/types/groups";
import type { HabitProgress } from "@/services/types/habits";
import { formatLongDate, parseApiDate } from "@/utils/date";
import { periodProgressLabel } from "@/utils/group-feed";
import DetailsModal, {
  DetailsAbout,
  DetailsAction,
  DetailsColumns,
  DetailsField,
  DetailsFooter,
  DetailsGoal,
  DetailsTitle,
} from "./details-modal";

export interface MemberHabitDetail {
  member: UserRef;
  habit: GroupHabit;
  progress: HabitProgress;
  // `YYYY-MM-DD` do dia das estatísticas (`as_of`)
  day: string;
}

export interface GroupHabitModalProps {
  // `null` deixa o modal fechado
  detail: MemberHabitDetail | null;
  groupName?: string;
  onClose: () => void;
  // Só no hábito da própria pessoa: abre o check-in com ele já marcado
  onCheckIn?: () => void;
}

/**
 * Hábito de uma pessoa ("Hábito pendente" no Figma). Hábito feito abre o
 * check-in; este modal só aparece feito quando o check-in não está no feed.
 */
export default function GroupHabitModal({
  detail,
  groupName,
  onClose,
  onCheckIn,
}: GroupHabitModalProps) {
  const done = detail?.progress.status === "completed";

  return (
    <DetailsModal
      visible={detail !== null}
      eyebrow="HÁBITO DO GRUPO"
      onClose={onClose}
    >
      {detail && (
        <>
          <DetailsTitle
            overline={`Hábito de ${detail.member.username}`}
            title={detail.habit.name}
            subtitle={detail.habit.description}
          />
          <DetailsGoal
            done={done}
            label={done ? "Concluído hoje" : "A fazer hoje"}
            value={periodProgressLabel(detail.progress)}
          />
          <DetailsField
            label="Programado para"
            value={formatLongDate(parseApiDate(detail.day))}
          />
          <DetailsColumns
            left={{
              label: "Frequência",
              value: describeGoal(detail.habit.goal),
            }}
            right={{
              label: "Categoria",
              value: habitCategoryLabels[detail.habit.category],
            }}
          />
          {!done && (
            <DetailsAbout
              label="Sobre este hábito"
              text="Este hábito ainda está na lista de hoje. O progresso aparece no círculo ao concluir a meta."
            />
          )}
          {!done && onCheckIn && (
            <DetailsAction
              icon="plus"
              label="Fazer check-in"
              onPress={onCheckIn}
            />
          )}
          {groupName && (
            <DetailsFooter text={`Compartilhado no grupo ${groupName}`} />
          )}
        </>
      )}
    </DetailsModal>
  );
}
