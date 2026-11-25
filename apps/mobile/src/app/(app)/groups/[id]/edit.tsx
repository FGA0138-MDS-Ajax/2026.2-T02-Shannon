import { router, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import FormHeader from "@/components/form-header";
import { GroupForm, type GroupFormValues } from "@/components/forms/group-form";
import { palette } from "@/components/statistics/palette";
import { theme } from "@/config/theme";
import { useGroup } from "@/hooks/useGroup";
import { getErrorMessage } from "@/services/api-errors";
import { updateGroup } from "@/services/groups-api";
import type { GroupDetail, GroupUpdate } from "@/services/types/groups";

// O PATCH recebe só o que mudou: campo ausente fica como está
function changedFields(group: GroupDetail, values: GroupFormValues) {
  const changes: GroupUpdate = {};
  if (values.name !== group.name) changes.name = values.name;
  if (values.description !== group.description)
    changes.description = values.description;
  if (values.ends_on !== group.ends_on) changes.ends_on = values.ends_on;
  if (values.ranking_criterion !== group.ranking_criterion)
    changes.ranking_criterion = values.ranking_criterion;
  return changes;
}

function confirmCriterionChange(): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      "Trocar o critério do ranking?",
      "A classificação de todo o grupo passa a contar pelo novo critério, inclusive o que já foi feito.",
      [
        { text: "Cancelar", style: "cancel", onPress: () => resolve(false) },
        { text: "Trocar", onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

export default function EditGroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: group, error, mutate } = useGroup(id);

  const handleSubmit = async (values: GroupFormValues) => {
    if (!group) return;

    const changes = changedFields(group, values);
    if (Object.keys(changes).length === 0) {
      router.back();
      return;
    }
    if (changes.ranking_criterion && !(await confirmCriterionChange())) {
      return;
    }

    const updated = await updateGroup(id, changes);
    mutate(updated, { revalidate: false });
    router.back();
  };

  const renderContent = () => {
    if (!group) {
      return (
        <View style={styles.centered}>
          {error ? (
            <Text style={styles.message}>{getErrorMessage(error)}</Text>
          ) : (
            <ActivityIndicator size="large" color={theme.colors.primary} />
          )}
        </View>
      );
    }

    return (
      <GroupForm
        initialValues={group}
        submitLabel="Salvar alterações"
        submittingLabel="Salvando..."
        onSubmit={handleSubmit}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <FormHeader title="Editar grupo" />

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
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  message: {
    fontFamily: theme.font.regular,
    fontSize: 14,
    color: palette.inkSoft,
    textAlign: "center",
  },
});
