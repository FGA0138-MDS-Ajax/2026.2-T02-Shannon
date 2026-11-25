import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { Alert, type AlertButton } from "react-native";
import { SWRConfig } from "swr";
import GroupAboutScreen from "@/app/(app)/groups/[id]/about";
import { ApiError } from "@/services/api";
import {
  addMember,
  getGroup,
  promoteMember,
  removeMember,
} from "@/services/groups-api";
import type { GroupDetail } from "@/services/types/groups";

jest.mock("expo-router", () => {
  const { useEffect } = jest.requireActual("react");
  return {
    router: { push: jest.fn(), back: jest.fn(), dismissTo: jest.fn() },
    useLocalSearchParams: () => ({ id: "g1" }),
    useFocusEffect: (effect: () => void) => useEffect(effect, [effect]),
  };
});

jest.mock("@/hooks/useSession", () => ({
  useSession: () => ({ user: { id: "u-caio" } }),
}));

jest.mock("@/services/groups-api", () => ({
  getGroup: jest.fn(),
  addMember: jest.fn(),
  promoteMember: jest.fn(),
  removeMember: jest.fn(),
}));

const mockGetGroup = getGroup as jest.MockedFunction<typeof getGroup>;

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

const aboutGroup: GroupDetail = {
  id: "g1",
  name: "Corrida da firma",
  description: "Quem corre mais até o fim do ano",
  starts_on: "2026-11-17",
  ends_on: null,
  ranking_criterion: "goals",
  status: "active",
  members_count: 2,
  my_role: "member",
  invite_code: null,
  members: [
    {
      user_id: "u-caio",
      username: "caio",
      role: "member",
      joined_at: "2026-11-17T12:05:00Z",
    },
    {
      user_id: "u-ana",
      username: "ana",
      role: "admin",
      joined_at: "2026-11-18T12:05:00Z",
    },
  ],
};

async function renderScreen() {
  return render(
    <SWRConfig
      value={{
        provider: () => new Map(),
        dedupingInterval: 0,
        shouldRetryOnError: false,
      }}
    >
      <GroupAboutScreen />
    </SWRConfig>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetGroup.mockResolvedValue(aboutGroup);
});

describe("GroupAboutScreen", () => {
  it("shows the group details", async () => {
    const screen = await renderScreen();

    expect(await screen.findByText("Corrida da firma")).toBeTruthy();
    expect(screen.getByText("17/11/2026")).toBeTruthy();
    expect(screen.getByText("Sem data de fim")).toBeTruthy();
    expect(screen.getByText("Ranking por metas batidas")).toBeTruthy();
    expect(screen.getByText("Ativo")).toBeTruthy();
  });

  it("lists the members and marks the current user", async () => {
    const screen = await renderScreen();

    expect(await screen.findByText("Membros (2)")).toBeTruthy();
    expect(screen.getByText(/caio/)).toBeTruthy();
    expect(screen.getByText(/\(você\)/)).toBeTruthy();
    expect(screen.getByText("ana")).toBeTruthy();
    expect(screen.getByText("Entrou em 18/11/2026")).toBeTruthy();
  });

  it("hides the admin actions from members", async () => {
    const screen = await renderScreen();

    await screen.findByText("Corrida da firma");
    expect(screen.queryByText("Editar grupo")).toBeNull();
    expect(screen.queryByTestId("add-member-input")).toBeNull();
  });

  describe("as admin", () => {
    beforeEach(() => {
      mockGetGroup.mockResolvedValue({ ...aboutGroup, my_role: "admin" });
    });

    it("offers to edit the group", async () => {
      const screen = await renderScreen();

      expect(await screen.findByText("Editar grupo")).toBeTruthy();
    });

    it("promotes a member", async () => {
      mockGetGroup.mockResolvedValue({
        ...aboutGroup,
        my_role: "admin",
        members: [
          aboutGroup.members[0],
          { ...aboutGroup.members[1], role: "member" },
        ],
      });
      pressInAlerts("Tornar admin");
      const screen = await renderScreen();

      await fireEvent.press(await screen.findByTestId("member-u-ana"));

      await waitFor(() =>
        expect(promoteMember).toHaveBeenCalledWith("g1", "u-ana"),
      );
    });

    it("removes a member after the confirmation", async () => {
      pressInAlerts("Remover do grupo", "Remover");
      const screen = await renderScreen();

      await fireEvent.press(await screen.findByTestId("member-u-ana"));

      await waitFor(() =>
        expect(removeMember).toHaveBeenCalledWith("g1", "u-ana"),
      );
    });

    it("does not offer actions on the current user", async () => {
      const alertSpy = jest.spyOn(Alert, "alert");
      const screen = await renderScreen();

      await fireEvent.press(await screen.findByTestId("member-u-caio"));

      expect(alertSpy).not.toHaveBeenCalled();
    });

    it("adds a member by username and shows API errors", async () => {
      (addMember as jest.Mock).mockRejectedValueOnce(
        new ApiError("Not found", 404, {
          detail: "Usuário não encontrado.",
        }),
      );
      const screen = await renderScreen();

      await fireEvent.changeText(
        await screen.findByTestId("add-member-input"),
        "joao",
      );
      await fireEvent.press(screen.getByText("Adicionar"));

      expect(await screen.findByText("Usuário não encontrado.")).toBeTruthy();
      expect(addMember).toHaveBeenCalledWith("g1", "joao");
    });
  });
});
