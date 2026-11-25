import { router, useLocalSearchParams } from "expo-router";
import { StyleSheet, View } from "react-native";
import useSWR from "swr";
import { GroupForm, type GroupFormValues } from "@/components/forms/group-form";
import {
  ActionRow,
  HeaderAction,
  QueryState,
  Screen,
  ScreenHeader,
} from "@/components/ui";
import { confirmAction, useAsyncAction } from "@/hooks/useAsyncAction";
import { request } from "@/services/api";
import { groupKeys, updateGroup } from "@/services/groups-api";
import type { GroupDetail, GroupUpdate } from "@/services/types/groups";
import { startOfToday, toApiDate } from "@/utils/date";

// A API aceita só os campos alterados. Mandar um `ends_on` passado sem mudar
// nada seria recusado (422), por isso a comparação.
function getChangedFields(
  group: GroupDetail,
  values: GroupFormValues,
): GroupUpdate {
  const changes: GroupUpdate = {};
  if (values.name !== group.name) changes.name = values.name;
  if (values.description !== group.description)
    changes.description = values.description;
  if (values.ends_on !== group.ends_on) changes.ends_on = values.ends_on;
  if (values.ranking_criterion !== group.ranking_criterion)
    changes.ranking_criterion = values.ranking_criterion;
  return changes;
}

export default function EditGroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    data: group,
    error,
    mutate: refreshGroup,
  } = useSWR<GroupDetail>(groupKeys.detail(id), request);
  const { busy, run } = useAsyncAction();

  const handleSubmit = async (values: GroupFormValues) => {
    if (!group) return;
    const changes = getChangedFields(group, values);
    if (Object.keys(changes).length > 0) {
      refreshGroup(await updateGroup(group.id, changes), { revalidate: false });
    }
    router.back();
  };

  const setEndsOn = (endsOn: string | null, errorTitle: string) =>
    run(errorTitle, async () => {
      refreshGroup(await updateGroup(id, { ends_on: endsOn }), {
        revalidate: false,
      });
      router.back();
    });

  const handleEnd = () =>
    confirmAction({
      title: "Encerrar grupo",
      message:
        "O grupo encerra ao fim de hoje: o ranking congela e ninguém mais entra. Você pode reabrir depois.",
      confirmLabel: "Encerrar",
      destructive: true,
      onConfirm: () =>
        setEndsOn(toApiDate(startOfToday()), "Não foi possível encerrar"),
    });

  const handleReopen = () =>
    confirmAction({
      title: "Reabrir grupo",
      message: "O grupo volta a ficar ativo, sem data de término.",
      confirmLabel: "Reabrir",
      onConfirm: () => setEndsOn(null, "Não foi possível reabrir"),
    });

  const renderContent = (group: GroupDetail) => {
    return (
      <>
        <GroupForm
          initialValues={group}
          submitLabel="Salvar alterações"
          submittingLabel="Salvando..."
          onSubmit={handleSubmit}
        />
        <View style={styles.actions}>
          {group.status === "ended" ? (
            <ActionRow
              testID="reopen-group-button"
              icon="rotate-ccw"
              title="Reabrir"
              description="Voltar a aceitar check-ins, hábitos e integrantes"
              disabled={busy}
              onPress={handleReopen}
            />
          ) : (
            <ActionRow
              testID="end-group-button"
              icon="archive"
              title="Encerrar"
              description="Encerrar o grupo ao fim de hoje e congelar o ranking"
              destructive
              disabled={busy}
              onPress={handleEnd}
            />
          )}
        </View>
      </>
    );
  };

  return (
    <Screen keyboardAvoiding>
      <ScreenHeader
        title="Editar grupo"
        action={<HeaderAction label="Cancelar" onPress={() => router.back()} />}
      />
      <QueryState data={group} error={error} onRetry={() => refreshGroup()}>
        {renderContent}
      </QueryState>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: {
    marginBottom: 16,
  },
});
