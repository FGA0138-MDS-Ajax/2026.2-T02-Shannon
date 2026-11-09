import { Pressable, StyleSheet, Text, View } from "react-native";
import { goalPeriodLabels, weekdayLabels } from "@/config/goal-labels";
import { theme } from "@/config/theme";
import type { GoalInput, GoalPeriod } from "@/services/types/habits";

export interface GoalPickerProps {
  label?: string;
  /** `null` enquanto nenhum tipo de meta foi escolhido. */
  value: GoalInput | null;
  onChange: (goal: GoalInput | null) => void;
  error?: string;
}

const periods = Object.keys(goalPeriodLabels) as GoalPeriod[];
const weekdays = [1, 2, 3, 4, 5, 6, 7];

// Ao escolher o tipo, os campos já vêm preenchidos; a pessoa só ajusta
const defaultGoals: Record<GoalPeriod, GoalInput> = {
  day: { period: "day" },
  week: { period: "week", target_count: 3, period_end_weekday: 7 },
  month: { period: "month", target_count: 15 },
};

// Limites da API: até 7 vezes na semana e até 28 no mês (cabe em fevereiro)
const maxCounts: Record<GoalPeriod, number> = { day: 1, week: 7, month: 28 };

export default function GoalPicker({
  label,
  value,
  onChange,
  error,
}: GoalPickerProps) {
  const count = value?.target_count ?? 1;

  const changeCount = (delta: number) => {
    if (!value) return;
    onChange({ ...value, target_count: count + delta });
  };

  const renderCount = (title: string) => {
    if (!value) return null;
    const max = maxCounts[value.period];
    return (
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>{title}</Text>
        <View style={styles.stepper}>
          <Pressable
            testID="goal-count-decrease"
            accessibilityLabel="Diminuir"
            disabled={count <= 1}
            onPress={() => changeCount(-1)}
            style={[styles.stepButton, count <= 1 && styles.stepDisabled]}
          >
            <Text style={styles.stepButtonText}>−</Text>
          </Pressable>
          <Text testID="goal-count" style={styles.count}>
            {count}
          </Text>
          <Pressable
            testID="goal-count-increase"
            accessibilityLabel="Aumentar"
            disabled={count >= max}
            onPress={() => changeCount(1)}
            style={[styles.stepButton, count >= max && styles.stepDisabled]}
          >
            <Text style={styles.stepButtonText}>+</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View style={styles.options}>
        {periods.map((period) => {
          const isSelected = value?.period === period;
          return (
            <Pressable
              key={period}
              testID={`goal-period-${period}`}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              // Tocar no tipo já selecionado desmarca, como no seletor de categoria
              onPress={() => onChange(isSelected ? null : defaultGoals[period])}
              style={[
                styles.option,
                isSelected && styles.optionSelected,
                !!error && !isSelected && styles.optionError,
              ]}
            >
              <Text
                style={[styles.optionText, isSelected && styles.textSelected]}
              >
                {goalPeriodLabels[period]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {value?.period === "day" && (
        <Text style={styles.hint}>1 vez por dia.</Text>
      )}

      {value?.period === "week" && (
        <>
          {renderCount("Vezes por semana")}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>A semana fecha em</Text>
            <View style={styles.options}>
              {weekdays.map((weekday) => {
                const isSelected = value.period_end_weekday === weekday;
                return (
                  <Pressable
                    key={weekday}
                    testID={`goal-weekday-${weekday}`}
                    accessibilityRole="radio"
                    accessibilityLabel={weekdayLabels[weekday]}
                    accessibilityState={{ selected: isSelected }}
                    onPress={() =>
                      onChange({ ...value, period_end_weekday: weekday })
                    }
                    style={[styles.option, isSelected && styles.optionSelected]}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        isSelected && styles.textSelected,
                      ]}
                    >
                      {weekdayLabels[weekday].slice(0, 3)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </>
      )}

      {value?.period === "month" && renderCount("Vezes por mês")}

      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginBottom: 16,
  },
  label: {
    fontFamily: theme.font.medium,
    fontSize: 14,
    color: "#3D3835",
    marginBottom: 6,
  },
  options: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  option: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D8D2CD",
    borderRadius: 9999,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  optionSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primaryDark,
  },
  optionError: {
    borderColor: "#DC2626",
  },
  optionText: {
    fontFamily: theme.font.regular,
    fontSize: 14,
    color: "#1C1917",
  },
  textSelected: {
    color: "#FFFFFF",
  },
  hint: {
    fontFamily: theme.font.regular,
    fontSize: 13,
    color: "#6B6560",
    marginTop: 8,
  },
  field: {
    marginTop: 12,
  },
  fieldLabel: {
    fontFamily: theme.font.regular,
    fontSize: 13,
    color: "#6B6560",
    marginBottom: 6,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  stepButton: {
    width: 36,
    height: 36,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: "#D8D2CD",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  stepDisabled: {
    opacity: 0.4,
  },
  stepButtonText: {
    fontFamily: theme.font.medium,
    fontSize: 18,
    color: "#1C1917",
  },
  count: {
    minWidth: 24,
    textAlign: "center",
    fontFamily: theme.font.semiBold,
    fontSize: 16,
    color: "#1C1917",
  },
  errorText: {
    fontFamily: theme.font.regular,
    fontSize: 12,
    color: "#DC2626",
    marginTop: 4,
  },
});
