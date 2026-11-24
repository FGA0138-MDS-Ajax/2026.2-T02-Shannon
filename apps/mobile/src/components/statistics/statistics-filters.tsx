import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Input from "@/components/input";
import { theme } from "@/config/theme";
import { isValidDays, MAX_DAYS, MIN_DAYS } from "@/hooks/useUserStatistics";
import type { StatisticsMode } from "@/services/types/statistics";
import { palette } from "./palette";

type Filters = { mode: StatisticsMode; days: number };

export interface StatisticsFiltersProps extends Filters {
  errors?: { mode?: string; days?: string };
  onChange: (next: Filters) => void;
}

const MODES: { value: StatisticsMode; label: string }[] = [
  { value: "calendar", label: "Semana e mês atuais" },
  { value: "rolling", label: "Últimos 7 e 30 dias" },
];

const PRESETS = [7, 30, 90];

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
    <View testID="statistics-filters" style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Período das estatísticas</Text>

        <View style={styles.segmented} accessibilityRole="radiogroup">
          {MODES.map((option) => {
            const selected = option.value === mode;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => onChange({ mode: option.value, days })}
                style={[styles.segment, selected && styles.segmentSelected]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    selected && styles.segmentTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {errors?.mode && <Text style={styles.error}>{errors.mode}</Text>}

        <View style={styles.presets}>
          {PRESETS.map((preset) => (
            <Pressable
              key={preset}
              accessibilityRole="button"
              accessibilityState={{ selected: preset === days }}
              onPress={() => onChange({ mode, days: preset })}
              style={[styles.preset, preset === days && styles.presetSelected]}
            >
              <Text style={styles.presetText}>{preset} dias</Text>
            </Pressable>
          ))}
        </View>

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 22,
    paddingBottom: 22,
    backgroundColor: palette.background,
  },
  card: {
    width: "100%",
    maxWidth: 640,
    alignSelf: "center",
    gap: 12,
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.cardBorder,
    borderRadius: 20,
    padding: 14,
  },
  title: {
    fontFamily: theme.font.medium,
    fontSize: 13,
    color: palette.ink,
  },
  segmented: {
    flexDirection: "row",
    backgroundColor: palette.pill,
    borderRadius: 9999,
    padding: 3,
  },
  segment: {
    flex: 1,
    borderRadius: 9999,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: "center",
  },
  segmentSelected: {
    backgroundColor: palette.ink,
  },
  segmentText: {
    fontFamily: theme.font.medium,
    fontSize: 11,
    color: palette.ink,
    textAlign: "center",
  },
  segmentTextSelected: {
    color: palette.cream,
  },
  presets: {
    flexDirection: "row",
    gap: 8,
  },
  preset: {
    borderWidth: 1,
    borderColor: palette.cardBorder,
    borderRadius: 9999,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  presetSelected: {
    backgroundColor: palette.sage,
    borderColor: palette.ink,
  },
  presetText: {
    fontFamily: theme.font.medium,
    fontSize: 11,
    color: palette.ink,
  },
  error: {
    fontFamily: theme.font.regular,
    fontSize: 12,
    color: palette.riskText,
  },
});
