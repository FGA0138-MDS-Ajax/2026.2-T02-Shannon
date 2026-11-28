import { Lucide } from "@react-native-vector-icons/lucide";
import { StyleSheet, Text, View } from "react-native";
import { CheckInPhoto } from "@/components/check-in-photo";
import { Card } from "@/components/ui";
import { theme } from "@/config/theme";
import type { CheckIn } from "@/services/types/habits";
import { formatTime } from "@/utils/date";
import { formatDuration } from "@/utils/duration";

export interface CheckInItemProps {
  checkIn: CheckIn;
  onPress: () => void;
}

// Card de um check-in na lista do dia: título, descrição, hora e duração
export default function CheckInItem({ checkIn, onPress }: CheckInItemProps) {
  const habitCount = checkIn.habit_ids.length;

  return (
    <Card
      testID={`check-in-item-${checkIn.id}`}
      onPress={onPress}
      accessibilityLabel={`Check-in ${checkIn.title}`}
      style={styles.card}
    >
      <View style={styles.row}>
        {checkIn.photo && (
          <CheckInPhoto
            checkInId={checkIn.id}
            photo={checkIn.photo}
            testID={`check-in-thumbnail-${checkIn.id}`}
          />
        )}

        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={1}>
              {checkIn.title}
            </Text>
            <Lucide
              name="chevron-right"
              size={18}
              color={theme.colors.subtle}
            />
          </View>

          {!!checkIn.description && (
            <Text style={styles.description} numberOfLines={2}>
              {checkIn.description}
            </Text>
          )}

          <View style={styles.meta}>
            <View style={styles.metaItem}>
              <Lucide name="clock" size={14} color={theme.colors.muted} />
              <Text style={styles.metaText}>
                {formatTime(checkIn.created_at)}
              </Text>
            </View>

            {!!checkIn.duration && (
              <View style={styles.duration}>
                <Text style={styles.durationText}>
                  {formatDuration(checkIn.duration)}
                </Text>
              </View>
            )}

            <Text style={[styles.metaText, styles.habits]}>
              {habitCount} {habitCount === 1 ? "hábito" : "hábitos"}
            </Text>
          </View>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  content: {
    flex: 1,
    gap: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  title: {
    flex: 1,
    fontFamily: theme.font.bold,
    fontSize: 16,
    color: theme.colors.text,
  },
  description: {
    fontFamily: theme.font.regular,
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 4,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontFamily: theme.font.regular,
    fontSize: 13,
    color: theme.colors.muted,
  },
  habits: {
    marginLeft: "auto",
  },
  duration: {
    backgroundColor: theme.colors.gray100,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  durationText: {
    fontFamily: theme.font.medium,
    fontSize: 12,
    color: theme.colors.primaryDark,
  },
});
