import { type Href, router } from "expo-router";
import { KeyboardAvoidingView, Platform, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import FormHeader from "@/components/form-header";
import { GroupForm, type GroupFormValues } from "@/components/forms/group-form";
import { theme } from "@/config/theme";
import { createGroup } from "@/services/groups-api";

export default function CreateGroupScreen() {
  const handleSubmit = async (values: GroupFormValues) => {
    const group = await createGroup(values);
    // replace: o "voltar" da tela do grupo leva para a lista, não para o formulário
    router.replace(`/groups/${group.id}` as Href);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <FormHeader title="Novo grupo" />

        <GroupForm
          submitLabel="Criar grupo"
          submittingLabel="Criando..."
          onSubmit={handleSubmit}
        />
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
});
