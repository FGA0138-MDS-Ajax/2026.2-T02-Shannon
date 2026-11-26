import { View } from "react-native";
import { ErrorBanner, ScreenHeader } from "@/components/ui";

export interface StatisticsErrorProps {
  message?: string;
  onRetry: () => void;
}

export default function StatisticsError({
  message,
  onRetry,
}: StatisticsErrorProps) {
  return (
    <View testID="statistics-error">
      <ScreenHeader
        title="Painel"
        subtitle="Não foi possível carregar o painel."
      />
      <ErrorBanner
        message={message ?? "Verifique sua conexão e tente de novo."}
        onRetry={onRetry}
      />
    </View>
  );
}
