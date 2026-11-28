import { Lucide } from "@react-native-vector-icons/lucide";
import { StyleSheet, Text, View } from "react-native";
import { CheckInPhoto } from "@/components/check-in-photo";
import { Card } from "@/components/ui";
import { habitCategoryIcons } from "@/config/habit-categories";
import { theme } from "@/config/theme";
import type { FeedItem } from "@/services/types/groups";
import type { HabitCategory } from "@/services/types/habits";
import { formatRelativeDateTime } from "@/utils/date";
import { joinHabitNames } from "@/utils/group-feed";

export interface FeedCardProps {
  item: FeedItem;
  /** Categoria do primeiro hábito, para o ícone */
  category?: HabitCategory;
  isMine: boolean;
  onPress: () => void;
}

/** Check-in no feed do grupo: quem, em quais hábitos, a hora e o título */
export function FeedCard({ item, category, isMine, onPress }: FeedCardProps) {
  return (
    <Card
      testID={`feed-item-${item.id}`}
      onPress={onPress}
      accessibilityLabel={`Check-in de ${item.author.username}`}
      style={styles.card}
    >
      <View style={styles.header}>
        {item.photo ? (
          <CheckInPhoto
            checkInId={item.id}
            photo={item.photo}
            testID={`feed-thumbnail-${item.id}`}
          />
        ) : (
          <View style={styles.icon}>
            <Lucide
              name={category ? habitCategoryIcons[category] : "sparkles"}
              size={18}
              color={theme.colors.primaryDark}
            />
          </View>
        )}
        <View style={styles.texts}>
          <Text style={styles.overline} numberOfLines={1}>
            {isMine ? "Você" : item.author.username} fez check-in em
          </Text>
          <Text style={styles.title} numberOfLines={2}>
            {joinHabitNames(item.habits)}
          </Text>
        </View>
        <Text style={styles.time}>
          {formatRelativeDateTime(item.created_at)}
        </Text>
      </View>
      <View style={styles.footer}>
        <Text style={[styles.description, styles.quote]} numberOfLines={1}>
          “{item.title}”
        </Text>
        <Lucide name="chevron-right" size={18} color={theme.colors.subtle} />
      </View>
    </Card>
  );
}

export interface MemberHabitCardProps {
  name: string;
  description: string | null;
  done: boolean;
  onPress: () => void;
  testID?: string;
}

/** Hábito do grupo na lista de uma pessoa: meta cumprida ou pendente */
export function MemberHabitCard({
  name,
  description,
  done,
  onPress,
  testID,
}: MemberHabitCardProps) {
  return (
    <Card testID={testID} onPress={onPress} style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.status, done && styles.statusDone]}>
          <Lucide
            name={done ? "check" : "minus"}
            size={16}
            color={done ? theme.colors.success : theme.colors.muted}
          />
        </View>
        <View style={styles.texts}>
          <Text style={styles.title} numberOfLines={1}>
            {name}
          </Text>
          <Text style={[styles.state, done && styles.stateDone]}>
            {done ? "Meta cumprida" : "Meta pendente"}
          </Text>
        </View>
        <Lucide name="chevron-right" size={18} color={theme.colors.subtle} />
      </View>
      {description && (
        <Text style={styles.description} numberOfLines={1}>
          {description}
        </Text>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: theme.colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  status: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.gray200,
    alignItems: "center",
    justifyContent: "center",
  },
  statusDone: {
    backgroundColor: theme.colors.successSoft,
  },
  texts: {
    flex: 1,
    gap: 2,
  },
  overline: {
    fontFamily: theme.font.regular,
    fontSize: 12,
    color: theme.colors.muted,
  },
  title: {
    fontFamily: theme.font.bold,
    fontSize: 16,
    color: theme.colors.text,
  },
  time: {
    alignSelf: "flex-start",
    fontFamily: theme.font.regular,
    fontSize: 12,
    color: theme.colors.muted,
  },
  state: {
    fontFamily: theme.font.medium,
    fontSize: 12,
    color: theme.colors.muted,
  },
  stateDone: {
    color: theme.colors.success,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  quote: {
    color: theme.colors.muted,
  },
  description: {
    flex: 1,
    fontFamily: theme.font.regular,
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
});
