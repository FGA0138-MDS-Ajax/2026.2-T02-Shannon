import DateTimePicker from "@expo/ui/community/datetime-picker";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { palette } from "@/components/statistics/palette";
import { theme } from "@/config/theme";
import { formatDate } from "@/utils/date";

export interface DateFieldProps {
  label: string;
  value: Date | null;
  onChange: (date: Date | null) => void;
  minimumDate: Date;
  error?: string;
  testID?: string;
}

// Data opcional: botão que abre o calendário do sistema e "Remover" para limpar
export default function DateField({
  label,
  value,
  onChange,
  minimumDate,
  error,
  testID,
}: DateFieldProps) {
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <Pressable
          testID={testID}
          onPress={() => setOpen(true)}
          style={[styles.button, !!error && styles.buttonError]}
        >
          <Text style={styles.buttonText}>
            {value ? formatDate(value) : "Escolher data"}
          </Text>
        </Pressable>
        {value && (
          <Pressable onPress={() => onChange(null)} hitSlop={8}>
            <Text style={styles.remove}>Remover</Text>
          </Pressable>
        )}
      </View>
      {error && <Text style={styles.error}>{error}</Text>}

      {open && (
        <DateTimePicker
          value={value ?? minimumDate}
          mode="date"
          minimumDate={minimumDate}
          presentation="dialog"
          accentColor={theme.colors.primary}
          onValueChange={(_event, date) => {
            setOpen(false);
            onChange(date);
          }}
          onDismiss={() => setOpen(false)}
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
    color: palette.ink,
    marginBottom: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  button: {
    backgroundColor: theme.colors.gray100,
    borderWidth: 1,
    borderColor: theme.colors.gray300,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  buttonError: {
    borderColor: palette.riskText,
  },
  buttonText: {
    fontFamily: theme.font.regular,
    fontSize: 16,
    color: palette.ink,
  },
  remove: {
    fontFamily: theme.font.medium,
    fontSize: 14,
    color: theme.colors.primaryDark,
  },
  error: {
    fontFamily: theme.font.regular,
    fontSize: 12,
    color: palette.riskText,
    marginTop: 4,
  },
});
