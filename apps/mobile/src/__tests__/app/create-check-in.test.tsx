import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { SWRConfig } from "swr";
import CreateCheckInScreen from "@/app/(app)/check-ins/create";
import { ApiError, request } from "@/services/api";
import { createCheckIn, uploadCheckInPhoto } from "@/services/check-ins-api";
import type {
  CheckInCreated,
  HabitOption,
  HabitProgress,
} from "@/services/types/habits";
import { pickPhoto, preparePhoto } from "@/utils/photo";

jest.mock("expo-router", () => {
  const { useEffect } = jest.requireActual("react");
  return {
    router: { replace: jest.fn(), back: jest.fn() },
    useFocusEffect: (effect: () => void) => useEffect(effect, [effect]),
    useLocalSearchParams: () => ({}),
  };
});

jest.mock("@/services/api", () => ({
  ...jest.requireActual("@/services/api"),
  request: jest.fn(),
}));

jest.mock("@/services/check-ins-api", () => ({
  ...jest.requireActual("@/services/check-ins-api"),
  createCheckIn: jest.fn(),
  listHabitOptions: jest.fn(),
  uploadCheckInPhoto: jest.fn(),
}));

jest.mock("@/utils/photo", () => ({
  pickPhoto: jest.fn(),
  preparePhoto: jest.fn(),
}));

const mockRequest = request as jest.MockedFunction<typeof request>;
const mockCreateCheckIn = createCheckIn as jest.MockedFunction<
  typeof createCheckIn
>;
const mockUploadPhoto = uploadCheckInPhoto as jest.MockedFunction<
  typeof uploadCheckInPhoto
>;
const mockPickPhoto = pickPhoto as jest.MockedFunction<typeof pickPhoto>;
const mockPreparePhoto = preparePhoto as jest.MockedFunction<
  typeof preparePhoto
>;
const { router } = jest.requireMock("expo-router");

const habitOptions: HabitOption[] = [
  {
    id: "h1",
    name: "Correr 5 km",
    category: "corrida",
    group: null,
    preselected: false,
  },
  {
    id: "h2",
    name: "Treino intervalado",
    category: "corrida",
    group: null,
    preselected: false,
  },
];

function makeProgress(
  habitId: string,
  overrides: Partial<HabitProgress> = {},
): HabitProgress {
  return {
    habit_id: habitId,
    goal: {
      schedule_type: "frequency",
      period: "week",
      target_count: 3,
      period_end_weekday: 7,
      starts_on: "2026-11-02",
    },
    current_period: {
      start: "2026-11-02",
      end: "2026-11-08",
      done: 2,
      target_count: 3,
    },
    status: "in_progress",
    current_streak: 1,
    best_streak: 1,
    streak_started_on: "2026-11-02",
    consistent_days: 2,
    ...overrides,
  };
}

function makeCreated(progress: HabitProgress[]): CheckInCreated {
  return {
    id: "check-in-1",
    user_id: "user-1",
    title: "Treino",
    description: null,
    created_at: "2026-11-08T10:00:00Z",
    duration: null,
    habit_ids: ["h1", "h2"],
    progress,
  };
}

// Cache novo a cada teste, senão o SWR reaproveita a resposta do anterior
function renderScreen() {
  return render(
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      <CreateCheckInScreen />
    </SWRConfig>,
  );
}

// Categoria → marca os dois hábitos → título → envia
async function submitCheckIn(screen: Awaited<ReturnType<typeof renderScreen>>) {
  await fireEvent.press(await screen.findByTestId("category-corrida"));
  await fireEvent.press(await screen.findByTestId("habit-h1"));
  await fireEvent.press(screen.getByTestId("habit-h2"));
  await fireEvent.press(screen.getByTestId("continue-button"));
  await fireEvent.changeText(
    screen.getByTestId("check-in-title-input"),
    "Treino",
  );
  await fireEvent.press(screen.getByTestId("submit-button"));
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRequest.mockImplementation(async (path: string) => {
    if (path.startsWith("/check-ins/categories")) {
      return { categories: [{ name: "corrida", habit_count: 2 }] };
    }
    return { items: habitOptions, page: 1, has_more: false };
  });
  mockPickPhoto.mockResolvedValue({
    uri: "file:///tmp/original.heic",
  } as never);
  mockPreparePhoto.mockResolvedValue({
    uri: "file:///tmp/foto.jpg",
    name: "check-in.jpg",
    type: "image/jpeg",
  });
  mockUploadPhoto.mockResolvedValue({
    thumbnail_url: "https://cdn.example.com/thumb.jpg",
    url: "https://cdn.example.com/full.jpg",
  });
});

describe("CreateCheckInScreen", () => {
  it("shows the progress of each habit after the check-in, matched by habit_id", async () => {
    // A API manda fora da ordem da tela
    mockCreateCheckIn.mockResolvedValueOnce(
      makeCreated([
        makeProgress("h2", { status: "at_risk" }),
        makeProgress("h1", {
          status: "completed",
          current_period: {
            start: "2026-11-02",
            end: "2026-11-08",
            done: 3,
            target_count: 3,
          },
        }),
      ]),
    );

    const screen = await renderScreen();
    await submitCheckIn(screen);

    expect(
      await screen.findByText("Check-in salvo! Seu progresso:"),
    ).toBeTruthy();
    expect(screen.getByText("Correr 5 km")).toBeTruthy();
    expect(screen.getByText("3 de 3 nesta semana")).toBeTruthy();
    expect(screen.getByText("Meta do período cumprida")).toBeTruthy();
    expect(screen.getByText("Treino intervalado")).toBeTruthy();
    expect(screen.getByText("Não pode faltar nenhum dia")).toBeTruthy();
    expect(router.replace).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByTestId("view-check-in-button"));
    expect(router.replace).toHaveBeenCalledWith("/check-ins/check-in-1");
  });

  it("shows only habits with a goal in the summary", async () => {
    mockCreateCheckIn.mockResolvedValueOnce(makeCreated([makeProgress("h2")]));

    const screen = await renderScreen();
    await submitCheckIn(screen);

    expect(await screen.findByTestId("progress-h2")).toBeTruthy();
    expect(screen.queryByTestId("progress-h1")).toBeNull();
  });

  it("goes straight to the check-in detail when no habit has a goal", async () => {
    mockCreateCheckIn.mockResolvedValueOnce(makeCreated([]));

    const screen = await renderScreen();
    await submitCheckIn(screen);

    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith("/check-ins/check-in-1"),
    );
    expect(screen.queryByText("Check-in salvo! Seu progresso:")).toBeNull();
  });

  it("keeps a suggested habit unchecked after the user unchecks it", async () => {
    mockRequest.mockImplementation(async (path: string) => {
      if (path.startsWith("/check-ins/categories")) {
        return { categories: [{ name: "corrida", habit_count: 2 }] };
      }
      return {
        items: [{ ...habitOptions[0], preselected: true }, habitOptions[1]],
        page: 1,
        has_more: false,
      };
    });
    const screen = await renderScreen();

    await fireEvent.press(await screen.findByTestId("category-corrida"));
    const suggested = await screen.findByTestId("habit-h1");
    expect(suggested.props.accessibilityState).toMatchObject({ checked: true });

    await fireEvent.press(suggested);

    expect(
      screen.getByTestId("habit-h1").props.accessibilityState,
    ).toMatchObject({ checked: false });
    expect(screen.getByText("0/20 selecionados")).toBeTruthy();
  });

  it("does not upload a photo when none was chosen", async () => {
    mockCreateCheckIn.mockResolvedValueOnce(makeCreated([makeProgress("h1")]));

    const screen = await renderScreen();
    await submitCheckIn(screen);

    await screen.findByText("Check-in salvo! Seu progresso:");
    expect(mockUploadPhoto).not.toHaveBeenCalled();
  });

  it("shows the chosen photo before sending", async () => {
    const screen = await renderScreen();

    await fireEvent.press(await screen.findByTestId("category-corrida"));
    await fireEvent.press(await screen.findByTestId("habit-h1"));
    await fireEvent.press(screen.getByTestId("continue-button"));
    await fireEvent.press(screen.getByTestId("photo-field-library"));

    expect(
      await screen.findByTestId("check-in-photo-field-preview"),
    ).toBeTruthy();
    expect(mockPickPhoto).toHaveBeenCalledWith("library");
    expect(mockPreparePhoto).toHaveBeenCalledWith({
      uri: "file:///tmp/original.heic",
    });
  });

  it("uploads the photo only after the check-in exists", async () => {
    mockCreateCheckIn.mockResolvedValueOnce(makeCreated([makeProgress("h1")]));
    const screen = await renderScreen();

    await fireEvent.press(await screen.findByTestId("category-corrida"));
    await fireEvent.press(await screen.findByTestId("habit-h1"));
    await fireEvent.press(screen.getByTestId("continue-button"));
    await fireEvent.press(screen.getByTestId("photo-field-library"));
    await screen.findByTestId("check-in-photo-field-preview");
    await fireEvent.changeText(
      screen.getByTestId("check-in-title-input"),
      "Treino",
    );
    await fireEvent.press(screen.getByTestId("submit-button"));

    await waitFor(() => {
      expect(mockUploadPhoto).toHaveBeenCalledWith("check-in-1", {
        uri: "file:///tmp/foto.jpg",
        name: "check-in.jpg",
        type: "image/jpeg",
      });
    });
    expect(mockCreateCheckIn.mock.invocationCallOrder[0]).toBeLessThan(
      mockUploadPhoto.mock.invocationCallOrder[0],
    );
  });

  it("keeps the check-in when the photo upload fails", async () => {
    mockCreateCheckIn.mockResolvedValueOnce(makeCreated([makeProgress("h1")]));
    mockUploadPhoto.mockRejectedValueOnce(
      new ApiError("Não foi possível salvar a foto. Tente novamente.", 503),
    );
    const screen = await renderScreen();

    await fireEvent.press(await screen.findByTestId("category-corrida"));
    await fireEvent.press(await screen.findByTestId("habit-h1"));
    await fireEvent.press(screen.getByTestId("continue-button"));
    await fireEvent.press(screen.getByTestId("photo-field-library"));
    await screen.findByTestId("check-in-photo-field-preview");
    await fireEvent.changeText(
      screen.getByTestId("check-in-title-input"),
      "Treino",
    );
    await fireEvent.press(screen.getByTestId("submit-button"));

    expect(
      await screen.findByText("Check-in salvo! Seu progresso:"),
    ).toBeTruthy();
    expect(
      screen.getByText("Não foi possível salvar a foto. Tente novamente."),
    ).toBeTruthy();
    expect(mockCreateCheckIn).toHaveBeenCalledTimes(1);
    // O check-in criado continua disponível para abrir no detalhe.
    await fireEvent.press(screen.getByTestId("view-check-in-button"));
    expect(router.replace).toHaveBeenCalledWith("/check-ins/check-in-1");
  });
});
