import { Lucide } from "@react-native-vector-icons/lucide";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { palette } from "@/components/statistics/palette";
import { theme } from "@/config/theme";

export interface GroupHeaderProps {
  // Fica de fora enquanto o grupo carrega
  name?: string;
}

/** Cabeçalho escuro da tela do grupo: voltar e o nome, numa linha só */
export default function GroupHeader({ name }: GroupHeaderProps) {
  return (
    <View style={styles.header}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Voltar"
        hitSlop={12}
        onPress={() => router.back()}
        style={({ pressed }) => [styles.back, pressed && styles.pressed]}
      >
        <Lucide name="chevron-left" size={26} color={palette.cream} />
      </Pressable>
      {name && (
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    // Um pouco mais alto; fica no fluxo da tela, então empurra o conteúdo
    // para baixo em vez de ficar por cima dele
    paddingTop: 10,
    paddingBottom: 12,
    paddingLeft: 16,
    paddingRight: 22,
  },
  back: {
    paddingVertical: 2,
  },
  pressed: {
    opacity: 0.6,
  },
  name: {
    flex: 1,
    fontFamily: theme.font.regular,
    fontSize: 22,
    color: palette.cream,
  },
});
