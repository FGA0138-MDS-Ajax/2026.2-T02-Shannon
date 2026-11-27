import { StyleSheet, View } from "react-native";
import { EmptyState, StatTile } from "@/components/ui";

// Usuário sem hábitos nem check-ins: números zerados e um convite para começar
// (a saudação fica no cabeçalho escuro da Home)
export default function StatisticsEmpty() {
  return (
    <View testID="statistics-empty">
      <EmptyState
        icon="sprout"
        title="Tudo pronto para começar"
        message="Faça seu primeiro check-in para ver suas estatísticas."
      />
      <View style={styles.zeros}>
        <StatTile label="Hábitos" value={0} />
        <StatTile label="Check-ins" value={0} />
        <StatTile label="Dias seguidos" value={0} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  zeros: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
});
