import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import useSWR from "swr";
import Button from "@/components/button";
import { CheckInEditForm } from "@/components/forms/checkin-edit-form";
import { theme } from "@/config/theme";
import { request } from "@/services/api";
import { getErrorMessage } from "@/services/api-errors";
import type { CheckIn } from "@/services/types/habits";

export default function EditCheckInScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    data: checkIn,
    isLoading,
    error,
    mutate: refreshCheckIn,
  } = useSWR<CheckIn>(`/check-ins/${id}`, request, {
    onError: (err) => setErrorMessage(getErrorMessage(err)),
  });

  const notFound = error?.status === 404;

  useFocusEffect(
    useCallback(() => {
      refreshCheckIn();
    }, [refreshCheckIn]),
  );

  const renderContent = () => {
    if (notFound) {
      return (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>Check-in não encontrado.</Text>
        </View>
      );
    }

    if (errorMessage) {
      return (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{errorMessage}</Text>
          <Button variant="secondary" onPress={() => refreshCheckIn()}>
            Tentar novamente
          </Button>
        </View>
      );
    }

    if (isLoading || !checkIn) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      );
    }

    return <CheckInEditForm key={checkIn.id} checkIn={checkIn} />;
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Editar check-in</Text>
          <Pressable onPress={() => router.back()} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Cancelar</Text>
          </Pressable>
        </View>

        {renderContent()}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: theme.colors.gray,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    marginTop: 16,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontFamily: theme.font.bold,
    fontSize: 28,
    color: "#1C1917",
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  cancelText: {
    fontFamily: theme.font.medium,
    fontSize: 14,
    color: theme.colors.primaryDark,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontFamily: theme.font.regular,
    fontSize: 15,
    color: "#6B6560",
    textAlign: "center",
  },
  errorBanner: {
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  errorBannerText: {
    fontFamily: theme.font.medium,
    fontSize: 14,
    color: "#B91C1C",
    textAlign: "center",
  },
});
