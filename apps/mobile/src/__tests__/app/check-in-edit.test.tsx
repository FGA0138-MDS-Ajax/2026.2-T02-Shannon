import { render } from "@testing-library/react-native";
import { SWRConfig } from "swr";
import EditCheckInScreen from "@/app/(app)/check-ins/[id]/edit";
import { request } from "@/services/api";
import type { CheckIn } from "@/services/types/habits";

jest.mock("expo-router", () => {
  const { useEffect } = jest.requireActual("react");
  return {
    router: { back: jest.fn(), push: jest.fn() },
    useLocalSearchParams: () => ({ id: "c1" }),
    useFocusEffect: (effect: () => void) => useEffect(effect, [effect]),
  };
});

jest.mock("@/hooks/useSession", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));

jest.mock("@/services/api", () => ({
  ...jest.requireActual("@/services/api"),
  request: jest.fn(),
}));

const mockRequest = request as jest.MockedFunction<typeof request>;

const checkIn: CheckIn = {
  id: "c1",
  user_id: "user-1",
  title: "Pedal no parque",
  description: null,
  created_at: "2026-11-20T10:00:00Z",
  duration: null,
  habit_ids: ["h1"],
};

async function renderScreen() {
  return render(
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      <EditCheckInScreen />
    </SWRConfig>,
  );
}

describe("EditCheckInScreen", () => {
  it("opens the form for the author", async () => {
    mockRequest.mockResolvedValue(checkIn);
    const screen = await renderScreen();

    expect(await screen.findByDisplayValue("Pedal no parque")).toBeTruthy();
  });

  it("blocks a check-in made by another group member", async () => {
    mockRequest.mockResolvedValue({ ...checkIn, user_id: "user-2" });
    const screen = await renderScreen();

    expect(
      await screen.findByText("Só quem fez o check-in pode editar."),
    ).toBeTruthy();
    expect(screen.queryByDisplayValue("Pedal no parque")).toBeNull();
  });
});
