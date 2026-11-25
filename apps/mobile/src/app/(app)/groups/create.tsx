import { type Href, router } from "expo-router";
import { GroupForm, type GroupFormValues } from "@/components/forms/group-form";
import { HeaderAction, Screen, ScreenHeader } from "@/components/ui";
import { createGroup } from "@/services/groups-api";

export default function CreateGroupScreen() {
  const handleSubmit = async (values: GroupFormValues) => {
    const group = await createGroup(values);
    router.replace(`/groups/${group.id}` as Href);
  };

  return (
    <Screen keyboardAvoiding>
      <ScreenHeader
        title="Novo grupo"
        action={<HeaderAction label="Cancelar" onPress={() => router.back()} />}
      />
      <GroupForm
        submitLabel="Criar grupo"
        submittingLabel="Criando..."
        onSubmit={handleSubmit}
      />
    </Screen>
  );
}
