import { Lucide } from "@react-native-vector-icons/lucide";
import { StyleSheet, Text, View } from "react-native";
import PressableScale from "@/components/pressable-scale";
import { categoryIcons } from "@/components/statistics/category-icons";
import { palette } from "@/components/statistics/palette";
import { theme } from "@/config/theme";
import type { FeedItem } from "@/services/types/groups";
import type { HabitCategory } from "@/services/types/habits";
import { formatTime } from "@/utils/date";
import { checkInPhrase, joinHabitNames } from "@/utils/group-feed";

// No Figma os fundos dos ícones se alternam de card em card
const TONES = [palette.riskBackground, palette.sand, palette.sageSoft];

export function feedCardTone(index: number): string {
  return TONES[index % TONES.length];
}

export interface GroupFeedCardProps {
  item: FeedItem;
  // Categoria do primeiro hábito, para o ícone. Sem ela, ícone genérico.
  category?: HabitCategory;
  tone?: string;
  onPress: () => void;
}

export default function GroupFeedCard({
  item,
  category,
  tone = TONES[0],
  onPress,
}: GroupFeedCardProps) {
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      style={styles.card}
    >
      <View style={styles.header}>
        <View style={[styles.icon, { backgroundColor: tone }]}>
          <Lucide
            name={category ? categoryIcons[category] : "sparkles"}
            size={18}
            color={palette.ink}
          />
        </View>
        <View style={styles.texts}>
          <Text style={styles.phrase} numberOfLines={1}>
            {checkInPhrase(item.author.username)}
          </Text>
          <Text style={styles.habits} numberOfLines={1}>
            {joinHabitNames(item.habits)}
          </Text>
        </View>
        <Text style={styles.time}>{formatTime(item.created_at)}</Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.title} numberOfLines={1}>
          {item.title}
        </Text>
        <Lucide name="arrow-up-right" size={16} color={palette.ink} />
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingTop: 14,
    paddingBottom: 14,
    paddingHorizontal: 16,
    gap: 12,
    backgroundColor: palette.card,
    borderWidth: 0.7,
    borderColor: palette.inkSoft,
    borderRadius: 22,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  icon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  texts: {
    flex: 1,
    gap: 4,
  },
  phrase: {
    fontFamily: theme.font.regular,
    fontSize: 10,
    color: palette.inkSoft,
  },
  habits: {
    fontFamily: theme.font.medium,
    fontSize: 16,
    color: palette.ink,
  },
  time: {
    alignSelf: "flex-start",
    paddingTop: 2,
    fontFamily: theme.font.regular,
    fontSize: 11,
    color: palette.inkSoft,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  title: {
    flex: 1,
    fontFamily: theme.font.regular,
    fontSize: 11,
    color: palette.inkSoft,
  },
});
