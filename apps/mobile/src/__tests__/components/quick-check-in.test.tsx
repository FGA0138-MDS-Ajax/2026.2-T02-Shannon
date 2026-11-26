import { fireEvent, render, waitFor } from "@testing-library/react-native";
import QuickCheckInSheet from "@/components/quick-check-in";
import { ApiError } from "@/services/api";
import { createCheckIn } from "@/services/check-ins-api";
import { listHabitCheckIns } from "@/services/habits-api";
import type { CheckIn } from "@/services/types/habits";

jest.mock("@/services/check-ins-api", () => ({ createCheckIn: jest.fn() }));
jest.mock("@/services/habits-api", () => ({ listHabitCheckIns: jest.fn() }));

const mockCreateCheckIn = createCheckIn as jest.MockedFunction<
  typeof createCheckIn
>;
const mockListHabitCheckIns = listHabitCheckIns as jest.MockedFunction<
  typeof listHabitCheckIns
>;

function checkIn(id: string, userId: string): CheckIn {
  return {
    id,
    user_id: userId,
    title: "Check-in",
    description: null,
    created_at: "2026-11-25T12:00:00Z",
    duration: null,
    habit_ids: ["h1"],
  };
}

const habit = {
  id: "h1",
  name: "Pedalar",
  group: { id: "g1", name: "Movimento diário" },
};

beforeEach(() => {
  jest.clearAllMocks();
  // Já fez 4; o check-in de outra pessoa do grupo não conta
  mockListHabitCheckIns.mockResolvedValue([
    checkIn("c1", "u1"),
    checkIn("c2", "u1"),
    checkIn("c3", "u1"),
    checkIn("c4", "u1"),
    checkIn("c5", "u2"),
  ]);
});

describe("QuickCheckInSheet", () => {
  it("fills the title with the habit name and the next number", async () => {
    const screen = await render(
      <QuickCheckInSheet habit={habit} userId="u1" onClose={jest.fn()} />,
    );

    await waitFor(() =>
      expect(screen.getByTestId("quick-check-in-title").props.value).toBe(
        "Pedalar #5",
      ),
    );
    expect(
      screen.getByLabelText("Hábito do grupo Movimento diário"),
    ).toBeTruthy();
    expect(mockListHabitCheckIns).toHaveBeenCalledWith("h1");
  });

  it("creates the check-in on confirm and closes", async () => {
    mockCreateCheckIn.mockResolvedValue({} as never);
    const onClose = jest.fn();
    const screen = await render(
      <QuickCheckInSheet habit={habit} userId="u1" onClose={onClose} />,
    );
    await waitFor(() =>
      expect(screen.getByTestId("quick-check-in-title").props.value).toBe(
        "Pedalar #5",
      ),
    );

    await fireEvent.press(screen.getByText("Confirmar"));

    expect(mockCreateCheckIn).toHaveBeenCalledWith({
      title: "Pedalar #5",
      habit_ids: ["h1"],
    });
    expect(onClose).toHaveBeenCalled();
  });

  it("keeps a title the person typed before the number arrives", async () => {
    let resolve: (value: CheckIn[]) => void = () => {};
    mockListHabitCheckIns.mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    mockCreateCheckIn.mockResolvedValue({} as never);
    const screen = await render(
      <QuickCheckInSheet habit={habit} userId="u1" onClose={jest.fn()} />,
    );

    await fireEvent.changeText(
      screen.getByTestId("quick-check-in-title"),
      "Volta no parque",
    );
    resolve([]);
    await fireEvent.press(screen.getByText("Confirmar"));

    expect(mockCreateCheckIn).toHaveBeenCalledWith({
      title: "Volta no parque",
      habit_ids: ["h1"],
    });
  });

  it("shows the API refusal and stays open", async () => {
    mockCreateCheckIn.mockRejectedValue(
      new ApiError("Conflict", 409, {
        detail: "Grupo encerrado não aceita check-ins.",
        habit_ids: ["h1"],
      }),
    );
    const onClose = jest.fn();
    const screen = await render(
      <QuickCheckInSheet habit={habit} userId="u1" onClose={onClose} />,
    );

    await fireEvent.press(screen.getByText("Confirmar"));

    expect(
      await screen.findByText("Grupo encerrado não aceita check-ins."),
    ).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("asks for a title when it is empty", async () => {
    const screen = await render(
      <QuickCheckInSheet habit={habit} userId="u1" onClose={jest.fn()} />,
    );

    await fireEvent.changeText(screen.getByTestId("quick-check-in-title"), " ");
    await fireEvent.press(screen.getByText("Confirmar"));

    expect(screen.getByText("Dê um título ao check-in.")).toBeTruthy();
    expect(mockCreateCheckIn).not.toHaveBeenCalled();
  });
});
