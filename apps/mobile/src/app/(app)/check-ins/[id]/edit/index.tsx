import { router, useLocalSearchParams } from "expo-router";
import useSWR from "swr";
import { CheckInEditForm } from "@/components/forms/check-in-edit-form";
import {
  HeaderAction,
  QueryState,
  Screen,
  ScreenHeader,
} from "@/components/ui";
import { useRefreshOnFocus } from "@/hooks/useRefreshOnFocus";
import { request } from "@/services/api";
import { checkInKeys } from "@/services/check-ins-api";
import type { CheckIn } from "@/services/types/habits";

export default function EditCheckInScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    data: checkIn,
    error,
    mutate: refreshCheckIn,
  } = useSWR<CheckIn>(checkInKeys.detail(id), request);

  useRefreshOnFocus(refreshCheckIn);

  const renderContent = (checkIn: CheckIn) => {
    return <CheckInEditForm key={checkIn.id} checkIn={checkIn} />;
  };

  return (
    <Screen keyboardAvoiding>
      <ScreenHeader
        title="Editar check-in"
        action={<HeaderAction label="Cancelar" onPress={() => router.back()} />}
      />
      <QueryState
        data={checkIn}
        error={error}
        onRetry={() => refreshCheckIn()}
        notFoundMessage="Check-in não encontrado."
      >
        {renderContent}
      </QueryState>
    </Screen>
  );
}
