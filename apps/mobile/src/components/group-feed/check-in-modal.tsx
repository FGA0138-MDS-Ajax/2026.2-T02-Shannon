import { describeGoal, describeProgressStatus } from "@/config/goal-labels";
import { habitCategoryLabels } from "@/config/habit-categories";
import type { FeedItem } from "@/services/types/groups";
import { formatLongDateTime } from "@/utils/date";
import {
  type CheckInHabitDetail,
  checkInPhrase,
  joinHabitNames,
  periodProgressLabel,
} from "@/utils/group-feed";
import DetailsModal, {
  DetailsAbout,
  DetailsColumns,
  DetailsField,
  DetailsFooter,
  DetailsGoal,
  DetailsTitle,
} from "./details-modal";

export interface GroupCheckInModalProps {
  // `null` deixa o modal fechado
  item: FeedItem | null;
  details: CheckInHabitDetail[];
  groupName?: string;
  onClose: () => void;
}

/** Check-in expandido: tudo vem do item do feed, sem nova requisição */
export default function GroupCheckInModal({
  item,
  details,
  groupName,
  onClose,
}: GroupCheckInModalProps) {
  // Com mais de um hábito, cada quadro e cada linha leva o nome dele
  const isMultiHabit = details.length > 1;

  return (
    <DetailsModal
      visible={item !== null}
      eyebrow="CHECK-IN DO GRUPO"
      onClose={onClose}
    >
      {item && (
        <>
          <DetailsTitle
            overline={checkInPhrase(item.author.username)}
            title={joinHabitNames(item.habits)}
            subtitle={item.title}
          />

          {details.map(({ habit, progress }) => {
            if (!progress) return null;
            const done = progress.status === "completed";
            const status = done
              ? "Concluído"
              : describeProgressStatus(progress);
            return (
              <DetailsGoal
                key={habit.id}
                done={done}
                label={isMultiHabit ? `${habit.name} · ${status}` : status}
                value={periodProgressLabel(progress)}
              />
            );
          })}

          <DetailsField
            label="Quando"
            value={formatLongDateTime(item.created_at)}
          />

          {details.map(({ habit }) => (
            <DetailsColumns
              key={habit.id}
              caption={isMultiHabit ? habit.name : undefined}
              left={{ label: "Frequência", value: describeGoal(habit.goal) }}
              right={{
                label: "Categoria",
                value: habitCategoryLabels[habit.category],
              }}
            />
          ))}

          {item.description && (
            <DetailsAbout label="Sobre este check-in" text={item.description} />
          )}

          {groupName && (
            <DetailsFooter text={`Registrado no grupo ${groupName}`} />
          )}
        </>
      )}
    </DetailsModal>
  );
}
