import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Text, View } from "react-native";
import Button from "@/components/button";
import Input from "@/components/input";
import {
  isValidDays,
  MAX_DAYS,
  MIN_DAYS,
  useUserStatistics,
} from "@/hooks/useUserStatistics";
import type {
  StatisticsMode,
  UserStatistics,
} from "@/services/types/statistics";

type Filters = { mode: StatisticsMode; days: number };

export default function StatisticsPanel() {
  const [filters, setFilters] = useState<Filters>({
    mode: "calendar",
    days: 30,
  });
  const [daysError, setDaysError] = useState<string>();
  const { data, status, error, fieldErrors, refetch } =
    useUserStatistics(filters);

  // Check-ins e metas mudam em outras telas e a API não avisa: recarrega ao voltar
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const handleFiltersChange = (next: Filters) => {
    if (!isValidDays(next.days)) {
      setDaysError(`Escolha entre ${MIN_DAYS} e ${MAX_DAYS} dias.`);
      return;
    }
    setDaysError(undefined);
    setFilters(next);
  };

  const isEmpty = data?.habits.total === 0 && data.check_ins.total === 0;

  return (
    <View>
      <StatisticsFilters
        mode={filters.mode}
        days={filters.days}
        errors={{ mode: fieldErrors.mode, days: daysError ?? fieldErrors.days }}
        onChange={handleFiltersChange}
      />

      {status === "loading" && <StatisticsSkeleton />}
      {status === "error" && (
        <StatisticsError message={error ?? undefined} onRetry={refetch} />
      )}
      {status === "success" && data && isEmpty && <StatisticsEmpty />}
      {status === "success" && data && !isEmpty && (
        <StatisticsContent data={data} />
      )}
    </View>
  );
}

// Substitutos até os componentes da #133 chegarem: mesmos nomes e props do
// contrato, então depois basta trocar por imports

function StatisticsSkeleton() {
  return <Text>Carregando estatísticas...</Text>;
}

function StatisticsEmpty() {
  return <Text>Faça seu primeiro check-in para ver suas estatísticas.</Text>;
}

function StatisticsError({
  message,
  onRetry,
}: {
  message?: string;
  onRetry: () => void;
}) {
  return (
    <View>
      <Text>{message}</Text>
      <Button variant="secondary" onPress={onRetry}>
        Tentar novamente
      </Button>
    </View>
  );
}

function StatisticsContent({ data }: { data: UserStatistics }) {
  return (
    <Text testID="statistics-content">{JSON.stringify(data, null, 2)}</Text>
  );
}

function StatisticsFilters({
  mode,
  days,
  errors,
  onChange,
}: Filters & {
  errors?: { mode?: string; days?: string };
  onChange: (next: Filters) => void;
}) {
  const [daysText, setDaysText] = useState(String(days));

  return (
    <View>
      <Button
        variant="secondary"
        onPress={() =>
          onChange({
            mode: mode === "calendar" ? "rolling" : "calendar",
            days,
          })
        }
      >
        {mode === "calendar" ? "Semana e mês atuais" : "Últimos 7 e 30 dias"}
      </Button>
      {errors?.mode && <Text>{errors.mode}</Text>}
      <Input
        testID="statistics-days-input"
        label="Dias"
        keyboardType="number-pad"
        value={daysText}
        onChangeText={setDaysText}
        onEndEditing={() => onChange({ mode, days: Number(daysText) })}
        error={errors?.days}
      />
    </View>
  );
}
