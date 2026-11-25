import DateTimePicker from "@expo/ui/community/datetime-picker";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "@/config/theme";
import { formatDate, startOfToday } from "@/utils/date";

export interface DateFieldProps {
  label: string;
  value: Date | null;
  onChange: (date: Date | null) => void;
  /** Primeiro dia aceito no calendário. Padrão: hoje. */
  minimumDate?: Date;
  placeholder?: string;
  error?: string;
  testID?: string;
}

// Campo de data opcional: abre o calendário do sistema e permite remover
export default function DateField({
  label,
  value,
  onChange,
  minimumDate,
  placeholder = "Escolher data",
  error,
  testID,
}: DateFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const minimum = minimumDate ?? startOfToday();

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <Pressable
          testID={testID}
          onPress={() => setIsOpen(true)}
          accessibilityRole="button"
          style={[styles.button, !!error && styles.buttonError]}
        >
          <Text style={styles.buttonText}>
            {value ? formatDate(value) : placeholder}
          </Text>
        </Pressable>
        {value && (
          <Pressable onPress={() => onChange(null)} hitSlop={8}>
            <Text style={styles.remove}>Remover</Text>
          </Pressable>
        )}
      </View>
      {error && <Text style={styles.error}>{error}</Text>}

      {isOpen && (
        <DateTimePicker
          value={value ?? minimum}
          mode="date"
          minimumDate={minimum}
          presentation="dialog"
          accentColor={theme.colors.primary}
          onValueChange={(_event, date) => {
            setIsOpen(false);
            onChange(date);
          }}
          onDismiss={() => setIsOpen(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontFamily: theme.font.medium,
    fontSize: 14,
    color: theme.colors.label,
    marginBottom: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  button: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
    borderRadius: theme.radius.md,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  buttonError: {
    borderColor: theme.colors.dangerStrong,
  },
  buttonText: {
    fontFamily: theme.font.regular,
    fontSize: 15,
    color: theme.colors.text,
  },
  remove: {
    fontFamily: theme.font.medium,
    fontSize: 14,
    color: theme.colors.primaryDark,
  },
  error: {
    fontFamily: theme.font.regular,
    fontSize: 12,
    color: theme.colors.dangerStrong,
    marginTop: 4,
  },
});
