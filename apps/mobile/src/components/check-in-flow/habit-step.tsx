import { Lucide } from "@react-native-vector-icons/lucide";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Button from "@/components/button";
import { ErrorBanner, Loading } from "@/components/ui";
import { habitCategoryLabels } from "@/config/habit-categories";
import { theme } from "@/config/theme";
import { type CheckInRejection, MAX_HABITS } from "@/hooks/useCheckInFlow";
import type { HabitCategory, HabitOption } from "@/services/types/habits";

export interface HabitStepProps {
  category: HabitCategory | null;
  options: HabitOption[] | null;
  selected: Set<string>;
  rejection: CheckInRejection | null;
  notice: string | null;
  hasMore: boolean;
  loadingMore: boolean;
  onToggle: (id: string) => void;
  onLoadMore: () => void;
  onContinue: () => void;
}

// Etapa 2: marcar os hábitos do check-in (da categoria e, com "Ver mais", das outras)
export default function HabitStep({
  category,
  options,
  selected,
  rejection,
  notice,
  hasMore,
  loadingMore,
  onToggle,
  onLoadMore,
  onContinue,
}: HabitStepProps) {
  if (options === null) return <Loading fill />;

  return (
    <>
      {notice && <ErrorBanner message={notice} />}

      <ScrollView contentContainerStyle={styles.list}>
        {options.length === 0 && (
          <Text style={styles.muted}>
            Nenhum hábito disponível nesta categoria.
          </Text>
        )}
        {options.map((habit) => (
          <HabitOptionRow
            key={habit.id}
            habit={habit}
            showCategory={habit.category !== category}
            isSelected={selected.has(habit.id)}
            // Desmarcar um recusado já é a correção: o destaque some junto
            rejectionReason={
              selected.has(habit.id) && rejection?.ids.has(habit.id)
                ? rejection.reason
                : undefined
            }
            onPress={() => onToggle(habit.id)}
          />
        ))}

        {hasMore && (
          <Button
            testID="see-more-button"
            variant="secondary"
            disabled={loadingMore}
            onPress={onLoadMore}
          >
            {loadingMore ? "Carregando..." : "Ver mais"}
          </Button>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.muted}>
          {selected.size}/{MAX_HABITS} selecionados
        </Text>
        <Button
          testID="continue-button"
          disabled={selected.size === 0}
          onPress={onContinue}
        >
          Continuar
        </Button>
      </View>
    </>
  );
}

interface HabitOptionRowProps {
  habit: HabitOption;
  showCategory: boolean;
  isSelected: boolean;
  rejectionReason?: string;
  onPress: () => void;
}

function HabitOptionRow({
  habit,
  showCategory,
  isSelected,
  rejectionReason,
  onPress,
}: HabitOptionRowProps) {
  return (
    <Pressable
      testID={`habit-${habit.id}`}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: isSelected }}
      onPress={onPress}
      style={[
        styles.option,
        isSelected && styles.optionSelected,
        !!rejectionReason && styles.optionRejected,
      ]}
    >
      <View style={styles.info}>
        <Text style={styles.name}>{habit.name}</Text>
        {(showCategory || habit.group) && (
          <Text style={styles.muted}>
            {[
              showCategory ? habitCategoryLabels[habit.category] : null,
              habit.group?.name,
            ]
              .filter(Boolean)
              .join(" · ")}
          </Text>
        )}
        {rejectionReason && (
          <Text style={styles.rejected}>{rejectionReason}</Text>
        )}
      </View>
      <View style={[styles.check, isSelected && styles.checkSelected]}>
        {isSelected && (
          <Lucide name="check" size={14} color={theme.colors.surface} />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 8,
    paddingVertical: 16,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  optionSelected: {
    borderColor: theme.colors.primary,
  },
  optionRejected: {
    borderColor: theme.colors.dangerStrong,
    backgroundColor: theme.colors.dangerSoft,
  },
  info: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontFamily: theme.font.semiBold,
    fontSize: 16,
    color: theme.colors.text,
  },
  muted: {
    fontFamily: theme.font.regular,
    fontSize: 14,
    color: theme.colors.muted,
  },
  rejected: {
    fontFamily: theme.font.regular,
    fontSize: 13,
    color: theme.colors.danger,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: theme.colors.inputBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  checkSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primaryDark,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
});
