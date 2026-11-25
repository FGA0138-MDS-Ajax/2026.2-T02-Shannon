import { Lucide } from "@react-native-vector-icons/lucide";
import { StyleSheet, Text, View } from "react-native";
import PressableScale from "@/components/pressable-scale";
import { palette } from "@/components/statistics/palette";
import { theme } from "@/config/theme";

// Peças que se repetem na parte clara das abas do grupo

/** "Classificação" / "por metas batidas" */
export function SheetTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={styles.titles}>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

/** Título escuro da parte de cima ("Ranking do grupo") com a linha de apoio */
export function HeroTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={styles.heroTitles}>
      <Text style={styles.heroTitle}>{title}</Text>
      {subtitle && <Text style={styles.heroSubtitle}>{subtitle}</Text>}
    </View>
  );
}

/** Link para as telas de gerenciar (convite, membros, criar hábito...) */
export function ManageLink({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <PressableScale
      accessibilityRole="link"
      onPress={onPress}
      style={styles.link}
    >
      <Text style={styles.linkText}>{label}</Text>
      <Lucide name="chevron-right" size={16} color={palette.ink} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  titles: {
    gap: 5,
  },
  title: {
    fontFamily: theme.font.medium,
    fontSize: 20,
    color: palette.ink,
  },
  subtitle: {
    fontFamily: theme.font.regular,
    fontSize: 11,
    color: palette.inkSoft,
  },
  heroTitles: {
    gap: 9,
  },
  heroTitle: {
    fontFamily: theme.font.regular,
    fontSize: 26,
    color: palette.cream,
  },
  heroSubtitle: {
    fontFamily: theme.font.regular,
    fontSize: 12,
    color: palette.headerLabel,
  },
  link: {
    marginTop: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 0.7,
    borderColor: palette.line,
    backgroundColor: palette.card,
  },
  linkText: {
    fontFamily: theme.font.medium,
    fontSize: 14,
    color: palette.ink,
  },
});
