import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { Alert, type AlertButton } from "react-native";
import { SWRConfig } from "swr";
import CheckInDetailScreen from "@/app/(app)/check-ins/[id]";
import { ApiError, request } from "@/services/api";
import {
  removeCheckInPhoto,
  uploadCheckInPhoto,
} from "@/services/check-ins-api";
import type { CheckIn } from "@/services/types/habits";
import { pickPhoto, preparePhoto } from "@/utils/check-in-photo";

jest.mock("expo-router", () => {
  const { useEffect } = jest.requireActual("react");
  return {
    router: { back: jest.fn(), push: jest.fn() },
    useLocalSearchParams: () => ({ id: "c1" }),
    useFocusEffect: (effect: () => void) => useEffect(effect, [effect]),
  };
});

jest.mock("expo-image", () => {
  const { View } = jest.requireActual("react-native");
  return { Image: (props: object) => <View testID="image" {...props} /> };
});

jest.mock("@/hooks/useSession", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));

jest.mock("@/services/api", () => ({
  ...jest.requireActual("@/services/api"),
  request: jest.fn(),
}));

jest.mock("@/services/check-ins-api", () => ({
  ...jest.requireActual("@/services/check-ins-api"),
  uploadCheckInPhoto: jest.fn(),
  removeCheckInPhoto: jest.fn(),
}));

jest.mock("@/utils/check-in-photo", () => ({
  ...jest.requireActual("@/utils/check-in-photo"),
  pickPhoto: jest.fn(),
  preparePhoto: jest.fn(),
}));

const mockRequest = jest.mocked(request);
const mockUpload = jest.mocked(uploadCheckInPhoto);
const { router } = jest.requireMock("expo-router");

const photo = {
  thumbnail_url: "https://storage/check-ins/c1/a-thumb.jpg?sig=1",
  url: "https://storage/check-ins/c1/a-full.jpg?sig=1",
};

function makeCheckIn(overrides: Partial<CheckIn> = {}): CheckIn {
  return {
    id: "c1",
    user_id: "user-1",
    title: "Pedal no parque",
    description: null,
    created_at: new Date().toISOString(),
    duration: null,
    habit_ids: ["h1"],
    photo: null,
    ...overrides,
  };
}

// Responde aos Alerts tocando nos botões com estes textos, na ordem
function pressInAlerts(...texts: string[]) {
  const queue = [...texts];
  jest.spyOn(Alert, "alert").mockImplementation((_title, _message, buttons) => {
    const text = queue.shift();
    (buttons as AlertButton[] | undefined)
      ?.find((button) => button.text === text)
      ?.onPress?.();
  });
}

async function renderScreen(checkIn: CheckIn) {
  mockRequest.mockResolvedValue(checkIn);
  const screen = await render(
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      <CheckInDetailScreen />
    </SWRConfig>,
  );
  await screen.findByText("Pedal no parque");
  return screen;
}

beforeEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
  jest.mocked(pickPhoto).mockResolvedValue({
    uri: "file:///a.heic",
    width: 4000,
    height: 3000,
  });
  jest.mocked(preparePhoto).mockResolvedValue({
    uri: "file:///a.jpg",
    size: 1000,
  });
});

describe("CheckInDetailScreen photo", () => {
  it("shows the full photo", async () => {
    const screen = await renderScreen(makeCheckIn({ photo }));

    expect(screen.getByTestId("check-in-photo").props.source.uri).toBe(
      photo.url,
    );
  });

  it("adds a photo from the library to a check-in from today", async () => {
    mockUpload.mockResolvedValueOnce(photo);
    pressInAlerts("Escolher da galeria");
    const screen = await renderScreen(makeCheckIn());

    await fireEvent.press(screen.getByText("Adicionar foto"));

    await waitFor(() =>
      expect(mockUpload).toHaveBeenCalledWith("c1", "file:///a.jpg"),
    );
    expect(pickPhoto).toHaveBeenCalledWith("library");
  });

  it.each([
    ["from another person", { user_id: "user-2" }],
    ["from another day", { created_at: "2026-01-10T12:00:00Z" }],
  ])("hides the photo controls on a check-in %s", async (_case, overrides) => {
    const screen = await renderScreen(makeCheckIn({ photo, ...overrides }));

    expect(screen.queryByText("Adicionar foto")).toBeNull();
    expect(screen.queryByText("Trocar foto")).toBeNull();
    expect(screen.queryByText("Remover foto")).toBeNull();
  });

  it("keeps the chosen photo to send again when storage fails", async () => {
    mockUpload.mockRejectedValueOnce(
      new ApiError("Unavailable", 503, {
        detail: "Não foi possível salvar a foto. Tente novamente.",
      }),
    );
    pressInAlerts("Escolher da galeria");
    const screen = await renderScreen(makeCheckIn());

    await fireEvent.press(screen.getByText("Adicionar foto"));
    await fireEvent.press(await screen.findByText("Tentar enviar de novo"));

    await waitFor(() => expect(mockUpload).toHaveBeenCalledTimes(2));
    expect(mockUpload).toHaveBeenLastCalledWith("c1", "file:///a.jpg");
  });

  it("hides the controls when the day has turned (409)", async () => {
    mockUpload.mockRejectedValueOnce(
      new ApiError("Conflict", 409, {
        detail: "Só é possível alterar a foto de um check-in de hoje.",
      }),
    );
    pressInAlerts("Escolher da galeria");
    const screen = await renderScreen(makeCheckIn());

    await fireEvent.press(screen.getByText("Adicionar foto"));

    await waitFor(() =>
      expect(Alert.alert).toHaveBeenLastCalledWith(
        "Não foi possível salvar a foto",
        "Só é possível alterar a foto de um check-in de hoje.",
      ),
    );
    expect(screen.queryByText("Adicionar foto")).toBeNull();
  });

  it("goes back when the check-in no longer exists (404)", async () => {
    mockUpload.mockRejectedValueOnce(
      new ApiError("Not found", 404, { detail: "Check-in não encontrado." }),
    );
    pressInAlerts("Escolher da galeria");
    const screen = await renderScreen(makeCheckIn());

    await fireEvent.press(screen.getByText("Adicionar foto"));

    await waitFor(() => expect(router.back).toHaveBeenCalled());
  });

  it("removes the photo after the confirmation", async () => {
    jest.mocked(removeCheckInPhoto).mockResolvedValueOnce(undefined);
    pressInAlerts("Remover");
    const screen = await renderScreen(makeCheckIn({ photo }));

    await fireEvent.press(screen.getByText("Remover foto"));

    await waitFor(() => expect(removeCheckInPhoto).toHaveBeenCalledWith("c1"));
  });
});
