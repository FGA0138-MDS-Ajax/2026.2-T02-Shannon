import { View } from "react-native";
import { ErrorBanner } from "@/components/ui";

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
      <ErrorBanner
        message={message ?? "Verifique sua conexão e tente de novo."}
        onRetry={onRetry}
      />
    </View>
  );
}
