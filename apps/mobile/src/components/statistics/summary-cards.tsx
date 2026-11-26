import { ProgressBar, StatTile } from "@/components/ui";
import type { UserStatistics } from "@/services/types/statistics";
import { plural } from "@/utils/text";
import { formatPercent, NO_DATA_LABEL } from "./format";

// Cartões da "Visão geral". Só exibem números calculados pela API.

export function CheckInsCard({ data }: { data: UserStatistics }) {
  const { month, week } = data.check_ins;
  // `mode` muda o que é "semana" e "mês": calendário ou últimos 7/30 dias
  const isCalendar = data.mode === "calendar";

  return (
    <StatTile
      testID="summary-check-ins"
      label={isCalendar ? "Check-ins no mês" : "Check-ins em 30 dias"}
      value={month}
      footer={`${week} ${isCalendar ? "nesta semana" : "em 7 dias"}`}
    />
  );
}

export function GoalCompletionCard({ data }: { data: UserStatistics }) {
  const { rate, completed_periods, total_periods } = data.goal_completion;
  // Sem períodos não há o que medir: "0%" daria a ideia errada de fracasso
  const hasData = total_periods > 0;

  return (
    <StatTile
      testID="summary-goals"
      label={`Metas em ${plural(data.goal_completion.days, "dia", "dias")}`}
      value={hasData ? formatPercent(rate) : NO_DATA_LABEL}
      compact={!hasData}
      footer={`${completed_periods} de ${plural(total_periods, "período", "períodos")}`}
    >
      <ProgressBar ratio={hasData ? rate / 100 : 0} />
    </StatTile>
  );
}
