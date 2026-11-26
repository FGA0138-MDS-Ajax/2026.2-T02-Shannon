import { Lucide } from "@react-native-vector-icons/lucide";
import { StyleSheet, Text, View } from "react-native";
import PressableScale from "@/components/pressable-scale";
import { palette } from "@/components/statistics/palette";
import { theme } from "@/config/theme";
import type { GroupRole, GroupStatus } from "@/services/types/groups";
import { membersLabel } from "@/utils/groups";

// Cores dos cards, na ordem da lista: as mesmas dos cards do grupo
// (laranja, verde e areia) e um escuro como o cabeçalho
const TONES = [
  { background: palette.orange, text: palette.ink, soft: palette.ink },
  { background: palette.sageSoft, text: palette.ink, soft: palette.inkSoft },
  { background: palette.sand, text: palette.ink, soft: palette.inkSoft },
  { background: palette.ink, text: palette.cream, soft: palette.headerLabel },
] as const;

export interface GroupCardProps {
  name: string;
  membersCount: number;
  role: GroupRole;
  status: GroupStatus;
  // Posição na lista: escolhe a cor
  index: number;
  onPress: () => void;
}

/** Card quadrado de um grupo na aba Grupos */
export default function GroupCard({
  name,
  membersCount,
  role,
  status,
  index,
  onPress,
}: GroupCardProps) {
  const ended = status === "ended";
  // Grupo encerrado fica apagado, sem a cor da vez
  const tone = ended
    ? { background: palette.cell, text: palette.inkSoft, soft: palette.inkSoft }
    : TONES[index % TONES.length];

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${membersLabel(membersCount)}`}
      onPress={onPress}
      style={[styles.card, { backgroundColor: tone.background }]}
    >
      <View style={styles.top}>
        <View style={styles.icon}>
          <Lucide name="users" size={18} color={tone.text} />
        </View>
        {role === "admin" && (
          <Text style={[styles.pill, { color: tone.text }]}>Admin</Text>
        )}
      </View>

      <View style={styles.bottom}>
        <Text style={[styles.name, { color: tone.text }]} numberOfLines={3}>
          {name}
        </Text>
        <Text style={[styles.meta, { color: tone.soft }]}>
          {ended
            ? `Encerrado · ${membersLabel(membersCount)}`
            : membersLabel(membersCount)}
        </Text>
      </View>
    </PressableScale>
  );
}

export interface GroupActionCardProps {
  icon: "plus" | "hash";
  label: string;
  onPress: () => void;
}

/** Card transparente com borda tracejada: criar grupo ou entrar com código */
export function GroupActionCard({
  icon,
  label,
  onPress,
}: GroupActionCardProps) {
  return (
    <PressableScale
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.card, styles.action]}
    >
      <View style={styles.actionIcon}>
        <Lucide name={icon} size={22} color={palette.ink} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  // Quadrado: ocupa a largura da célula da grade e a altura acompanha
  card: {
    width: "100%",
    aspectRatio: 1,
    padding: 16,
    borderRadius: 22,
    justifyContent: "space-between",
  },
  top: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.28)",
  },
  pill: {
    overflow: "hidden",
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius: 9999,
    backgroundColor: "rgba(255, 255, 255, 0.28)",
    fontFamily: theme.font.medium,
    fontSize: 10,
  },
  bottom: {
    gap: 6,
  },
  name: {
    fontFamily: theme.font.medium,
    fontSize: 18,
    lineHeight: 23,
  },
  meta: {
    fontFamily: theme.font.regular,
    fontSize: 11,
  },
  action: {
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: palette.inkSoft,
    backgroundColor: "transparent",
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.pill,
  },
  actionLabel: {
    fontFamily: theme.font.medium,
    fontSize: 13,
    color: palette.ink,
    textAlign: "center",
  },
});
