import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { Alert, type AlertButton, Share } from "react-native";
import GroupInvite from "@/components/group-invite";
import { regenerateInvite } from "@/services/groups-api";

jest.mock("@/services/groups-api", () => ({ regenerateInvite: jest.fn() }));

const mockRegenerate = regenerateInvite as jest.MockedFunction<
  typeof regenerateInvite
>;

function answerAlert(text: string) {
  jest.spyOn(Alert, "alert").mockImplementation((_title, _message, buttons) => {
    (buttons as AlertButton[] | undefined)
      ?.find((button) => button.text === text)
      ?.onPress?.();
  });
}

async function renderInvite(onRegenerated = jest.fn()) {
  const screen = await render(
    <GroupInvite
      groupId="g1"
      groupName="Pedal de domingo"
      code="K7Q2MX9P"
      onRegenerated={onRegenerated}
    />,
  );
  return { screen, onRegenerated };
}

beforeEach(() => {
  jest.restoreAllMocks();
  mockRegenerate.mockReset();
});

describe("GroupInvite", () => {
  it("shares the code as text", async () => {
    const share = jest.spyOn(Share, "share").mockResolvedValue({
      action: Share.sharedAction,
      activityType: undefined,
    });
    const { screen } = await renderInvite();

    expect(screen.getByText("K7Q2MX9P")).toBeTruthy();
    await fireEvent.press(screen.getByText("Compartilhar código"));

    expect(share).toHaveBeenCalledWith({
      message:
        'Entra no grupo "Pedal de domingo" no Habbit com o código K7Q2MX9P',
    });
  });

  it("generates a new code after the confirmation", async () => {
    mockRegenerate.mockResolvedValueOnce({ invite_code: "NEWCODE1" });
    answerAlert("Gerar novo");
    const { screen, onRegenerated } = await renderInvite();

    await fireEvent.press(screen.getByText("Gerar novo código"));

    await waitFor(() => expect(onRegenerated).toHaveBeenCalled());
    expect(mockRegenerate).toHaveBeenCalledWith("g1");
  });

  it("keeps the code when the user cancels", async () => {
    answerAlert("Cancelar");
    const { screen } = await renderInvite();

    await fireEvent.press(screen.getByText("Gerar novo código"));

    expect(mockRegenerate).not.toHaveBeenCalled();
  });
});
