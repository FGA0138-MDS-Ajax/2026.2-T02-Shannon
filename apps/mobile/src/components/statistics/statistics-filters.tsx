import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Input from "@/components/input";
import {
  Card,
  type ChipOption,
  FilterChips,
  Section,
  SegmentedTabs,
} from "@/components/ui";
import { theme } from "@/config/theme";
import { isValidDays, MAX_DAYS, MIN_DAYS } from "@/hooks/useUserStatistics";
import type { StatisticsMode } from "@/services/types/statistics";

type Filters = { mode: StatisticsMode; days: number };

export interface StatisticsFiltersProps extends Filters {
  errors?: { mode?: string; days?: string };
  onChange: (next: Filters) => void;
}

const MODES: ChipOption<StatisticsMode>[] = [
  { value: "calendar", label: "Semana e mês atuais" },
  { value: "rolling", label: "Últimos 7 e 30 dias" },
];

const PRESETS: ChipOption<number>[] = [7, 30, 90].map((days) => ({
  value: days,
  label: `${days} dias`,
}));

// Componente controlado: quem decide os valores e busca os dados é o painel
export default function StatisticsFilters({
  mode,
  days,
  errors,
  onChange,
}: StatisticsFiltersProps) {
  // O campo guarda o texto digitado; o número só vai para o painel ao terminar
  const [daysText, setDaysText] = useState(String(days));

  useEffect(() => {
    setDaysText(String(days));
  }, [days]);

  const typedDays = Number(daysText);
  const localError =
    daysText !== "" && !isValidDays(typedDays)
      ? `Escolha entre ${MIN_DAYS} e ${MAX_DAYS} dias.`
      : undefined;

  return (
    <View testID="statistics-filters">
      <Section title="Período das estatísticas">
        <Card style={styles.card}>
          <Text style={styles.label}>Semana e mês</Text>
          <SegmentedTabs
            options={MODES}
            value={mode}
            onChange={(next) => onChange({ mode: next, days })}
            testIDPrefix="statistics-mode"
          />
          {errors?.mode && <Text style={styles.error}>{errors.mode}</Text>}

          <Text style={[styles.label, styles.spaced]}>Período analisado</Text>
          <FilterChips
            // Um valor fora dos atalhos deixa nenhum chip marcado
            options={PRESETS}
            value={days}
            onChange={(next) => onChange({ mode, days: next })}
            testIDPrefix="statistics-days"
          />

          <View style={styles.spaced}>
            <Input
              testID="statistics-days-input"
              label={`Dias analisados (${MIN_DAYS} a ${MAX_DAYS})`}
              keyboardType="number-pad"
              value={daysText}
              onChangeText={setDaysText}
              onEndEditing={() => onChange({ mode, days: typedDays })}
              // O erro da API (422) tem prioridade sobre a validação local
              error={errors?.days ?? localError}
            />
          </View>
        </Card>
      </Section>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 8,
    paddingBottom: 0,
  },
  label: {
    fontFamily: theme.font.medium,
    fontSize: 14,
    color: theme.colors.label,
  },
  spaced: {
    marginTop: 8,
  },
  error: {
    fontFamily: theme.font.regular,
    fontSize: 12,
    color: theme.colors.dangerStrong,
  },
});
