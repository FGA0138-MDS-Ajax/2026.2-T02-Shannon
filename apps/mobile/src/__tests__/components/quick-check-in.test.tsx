import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { SWRConfig } from "swr";
import QuickCheckInSheet from "@/components/quick-check-in";
import { ApiError, request } from "@/services/api";
import { createCheckIn } from "@/services/check-ins-api";
import type { CheckIn } from "@/services/types/habits";

jest.mock("@/services/check-ins-api", () => ({
  ...jest.requireActual("@/services/check-ins-api"),
  createCheckIn: jest.fn(),
}));

jest.mock("@/services/api", () => ({
  ...jest.requireActual("@/services/api"),
  request: jest.fn(),
}));

const mockCreate = createCheckIn as jest.MockedFunction<typeof createCheckIn>;
const mockRequest = request as jest.MockedFunction<typeof request>;

// GET /habits/habit-1/check-ins, buscado pela folha para numerar o título
function mockCheckIns(checkIns: CheckIn[]) {
  mockRequest.mockImplementation(async (endpoint: string) => {
    if (endpoint === "/habits/habit-1/check-ins") return checkIns;
    throw new Error(`Rota inesperada: ${endpoint}`);
  });
}

function checkIn(id: string, userId: string): CheckIn {
  return {
    id,
    user_id: userId,
    title: "Leitura",
    description: null,
    duration: null,
    habit_ids: ["habit-1"],
    created_at: "2026-11-25T10:00:00Z",
  };
}

const habit = { id: "habit-1", name: "Ler 10 páginas" };

function renderSheet(onClose = jest.fn()) {
  return render(
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      <QuickCheckInSheet habit={habit} userId="user-1" onClose={onClose} />
    </SWRConfig>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("QuickCheckInSheet", () => {
  it("numbers the title with your own check-ins only", async () => {
    // Em hábito de grupo vêm os check-ins de todo mundo
    mockCheckIns([
      checkIn("a", "user-1"),
      checkIn("b", "user-2"),
      checkIn("c", "user-1"),
    ]);
    const screen = await renderSheet();

    await waitFor(() =>
      expect(screen.getByTestId("quick-check-in-title").props.value).toBe(
        "Ler 10 páginas #3",
      ),
    );
  });

  it("creates the check-in with the habit and closes", async () => {
    mockCheckIns([]);
    mockCreate.mockResolvedValue({} as never);
    const onClose = jest.fn();
    const screen = await renderSheet(onClose);

    await waitFor(() =>
      expect(screen.getByTestId("quick-check-in-title").props.value).toBe(
        "Ler 10 páginas #1",
      ),
    );
    await fireEvent.press(screen.getByTestId("quick-check-in-confirm"));

    expect(mockCreate).toHaveBeenCalledWith({
      title: "Ler 10 páginas #1",
      habit_ids: ["habit-1"],
    });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("keeps the sheet open and shows the API error", async () => {
    mockCheckIns([]);
    mockCreate.mockRejectedValue(
      new ApiError("Erro", 422, { detail: "Hábito encerrado." }),
    );
    const onClose = jest.fn();
    const screen = await renderSheet(onClose);

    await fireEvent.press(screen.getByTestId("quick-check-in-confirm"));

    expect(await screen.findByText("Hábito encerrado.")).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("asks for a title when it is empty", async () => {
    mockCheckIns([]);
    const screen = await renderSheet();

    await fireEvent.changeText(screen.getByTestId("quick-check-in-title"), " ");
    await fireEvent.press(screen.getByTestId("quick-check-in-confirm"));

    expect(screen.getByText("Informe o título do check-in.")).toBeTruthy();
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
