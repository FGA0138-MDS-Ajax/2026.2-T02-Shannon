import { StyleSheet, View } from "react-native";
import { EmptyState, ScreenHeader, StatTile } from "@/components/ui";

// Usuário sem hábitos nem check-ins: números zerados e um convite para começar
export default function StatisticsEmpty({ userName }: { userName?: string }) {
  const firstName = userName?.trim().split(" ")[0];

  return (
    <View testID="statistics-empty">
      <ScreenHeader title={firstName ? `Olá, ${firstName}!` : "Olá!"} />
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
