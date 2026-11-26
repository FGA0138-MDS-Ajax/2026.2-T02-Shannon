import { Lucide } from "@react-native-vector-icons/lucide";
import { StyleSheet, Text, View } from "react-native";
import { palette } from "@/components/statistics/palette";
import { theme } from "@/config/theme";

export interface GroupTagProps {
  name: string;
}

/** Etiqueta "👥 Movimento diário" nos hábitos que são de um grupo */
export default function GroupTag({ name }: GroupTagProps) {
  return (
    <View
      style={styles.tag}
      accessible
      accessibilityLabel={`Hábito do grupo ${name}`}
    >
      <Lucide name="users" size={11} color={palette.sageInk} />
      <Text style={styles.text} numberOfLines={1}>
        {name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    flexShrink: 1,
    gap: 5,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 9999,
    backgroundColor: palette.sageSoft,
  },
  text: {
    flexShrink: 1,
    fontFamily: theme.font.medium,
    fontSize: 11,
    color: palette.sageInk,
  },
});
