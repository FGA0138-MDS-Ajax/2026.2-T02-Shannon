import { StyleSheet, Text } from "react-native";
import { Avatar, Card } from "@/components/ui";
import { theme } from "@/config/theme";

export interface RankingRowProps {
  /** Sem posição (todo mundo em 0) mostra um traço */
  position?: number;
  /** Texto da linha (ex.: "Você") */
  label: string;
  /** Nome de usuário, para a inicial do avatar */
  username: string;
  score: string;
  color: string;
  isMe: boolean;
  onPress: () => void;
  testID?: string;
}

// Linha da classificação do grupo: posição, avatar, nome e pontuação
export default function RankingRow({
  position,
  label,
  username,
  score,
  color,
  isMe,
  onPress,
  testID,
}: RankingRowProps) {
  return (
    <Card
      testID={testID}
      onPress={onPress}
      highlighted={isMe}
      accessibilityLabel={`${label}, ${score}`}
      style={styles.row}
    >
      <Text style={styles.position}>
        {position === undefined ? "–" : `${position}º`}
      </Text>
      <Avatar name={username} color={color} size={36} />
      <Text style={styles.name} numberOfLines={1}>
        {label}
      </Text>
      <Text style={styles.score}>{score}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
  },
  position: {
    width: 28,
    fontFamily: theme.font.semiBold,
    fontSize: 14,
    color: theme.colors.muted,
  },
  name: {
    flex: 1,
    fontFamily: theme.font.semiBold,
    fontSize: 15,
    color: theme.colors.text,
  },
  score: {
    fontFamily: theme.font.semiBold,
    fontSize: 14,
    color: theme.colors.text,
  },
});
