import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Button from "@/components/button";
import Input from "@/components/input";
import { theme } from "@/config/theme";
import { ApiError } from "@/services/api";
import {
  FORM_ERROR_KEY,
  getErrorMessage,
  getFieldErrors,
} from "@/services/api-errors";
import { getCheckIn, updateCheckIn } from "@/services/check-ins-api";
import type { CheckIn, CheckInUpdate } from "@/services/types/habits";
import { isoDurationToMinutes, minutesToIsoDuration } from "@/utils/duration";

type FieldErrors = {
  title?: string;
  description?: string;
  duration?: string;
};

function durationToText(duration: string | null): string {
  const minutes = duration ? isoDurationToMinutes(duration) : null;
  return minutes ? String(minutes) : "";
}

export default function EditCheckInScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [checkIn, setCheckIn] = useState<CheckIn | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Busca de novo a cada abertura: a tela continua montada entre as visitas
  const loadCheckIn = useCallback(async () => {
    setCheckIn(null);
    setNotFound(false);
    setErrorMessage(null);

    try {
      setCheckIn(await getCheckIn(id));
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 404) {
        setNotFound(true);
      } else {
        setErrorMessage(getErrorMessage(err));
      }
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      loadCheckIn();
    }, [loadCheckIn]),
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
          <Button variant="secondary" onPress={loadCheckIn}>
            Tentar novamente
          </Button>
        </View>
      );
    }

    if (!checkIn) {
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

// Separado da tela para os campos começarem com os valores do check-in já carregado
function CheckInEditForm({ checkIn }: { checkIn: CheckIn }) {
  const initialDuration = durationToText(checkIn.duration);
  const [title, setTitle] = useState(checkIn.title);
  const [description, setDescription] = useState(checkIn.description ?? "");
  const [duration, setDuration] = useState(initialDuration);

  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    setErrorMessage(null);

    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();
    const trimmedDuration = duration.trim();
    const errors: FieldErrors = {};

    if (!trimmedTitle) {
      errors.title = "Informe o título do check-in.";
    } else if (trimmedTitle.length > 150) {
      errors.title = "Use no máximo 150 caracteres.";
    }

    if (trimmedDescription.length > 500) {
      errors.description = "Use no máximo 500 caracteres.";
    }

    if (trimmedDuration && !/^\d+$/.test(trimmedDuration)) {
      errors.duration = "Use apenas números inteiros.";
    } else if (trimmedDuration && Number(trimmedDuration) <= 0) {
      errors.duration = "A duração deve ser maior que zero.";
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    // A API aceita só os campos alterados; `null` limpa descrição e duração
    const changes: CheckInUpdate = {};
    if (trimmedTitle !== checkIn.title) changes.title = trimmedTitle;
    if ((trimmedDescription || null) !== checkIn.description)
      changes.description = trimmedDescription || null;
    // Compara com o texto inicial: a API pode guardar segundos que o campo não mostra
    if (trimmedDuration !== initialDuration)
      changes.duration = trimmedDuration
        ? minutesToIsoDuration(Number(trimmedDuration))
        : null;

    if (Object.keys(changes).length === 0) {
      router.back();
      return;
    }

    try {
      setSubmitting(true);
      await updateCheckIn(checkIn.id, changes);
      router.back();
    } catch (err: unknown) {
      // Erros por campo (422) vão embaixo de cada campo; o resto vai na faixa
      const { [FORM_ERROR_KEY]: formError, ...apiFieldErrors } =
        getFieldErrors(err);
      setFieldErrors(apiFieldErrors);
      if (formError) {
        setErrorMessage(formError);
      } else if (Object.keys(apiFieldErrors).length === 0) {
        setErrorMessage(getErrorMessage(err));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.form}>
      {errorMessage && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{errorMessage}</Text>
        </View>
      )}

      <ScrollView style={styles.fields} keyboardShouldPersistTaps="handled">
        <Input
          testID="check-in-title-input"
          label="Título"
          placeholder="ex: Corrida no parque"
          value={title}
          onChangeText={setTitle}
          autoCapitalize="sentences"
          maxLength={150}
          error={fieldErrors.title}
        />

        <Input
          testID="check-in-description-input"
          label="Descrição (opcional)"
          placeholder="Como foi?"
          value={description}
          onChangeText={setDescription}
          autoCapitalize="sentences"
          multiline
          maxLength={500}
          error={fieldErrors.description}
        />

        <Input
          testID="check-in-duration-input"
          label="Duração em minutos (opcional)"
          placeholder="ex: 45"
          value={duration}
          onChangeText={setDuration}
          keyboardType="number-pad"
          error={fieldErrors.duration}
        />
      </ScrollView>

      <View style={styles.actions}>
        <Button
          variant="primary"
          width="full"
          disabled={submitting}
          style={styles.actionButton}
          onPress={handleSubmit}
        >
          {submitting ? "Salvando..." : "Salvar"}
        </Button>
      </View>
    </View>
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
  form: {
    flex: 1,
  },
  fields: {
    flex: 1,
  },
  actions: {
    paddingVertical: 12,
  },
  // O Button tem margem lateral de 8; somada à largura total, ele passaria
  // da borda direita
  actionButton: {
    marginHorizontal: 0,
  },
});
