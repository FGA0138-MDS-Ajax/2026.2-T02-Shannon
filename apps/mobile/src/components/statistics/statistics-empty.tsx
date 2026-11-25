import { StyleSheet, View } from "react-native";
import { EmptyState, ScreenHeader, StatTile } from "@/components/ui";
import { greeting } from "./format";

// Usuário sem hábitos nem check-ins: números zerados e um convite para começar
export default function StatisticsEmpty({ userName }: { userName?: string }) {
  return (
    <View testID="statistics-empty">
      <ScreenHeader title={greeting(userName)} />
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
