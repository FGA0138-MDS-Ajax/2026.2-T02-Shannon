import { Alert, Share } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";
import GroupAbout from "@/components/groups/group-about";
import { regenerateInviteCode } from "@/services/groups-api";
import type { GroupDetail } from "@/services/types/groups";

jest.mock("@/hooks/useSession", () => ({ useSession: () => ({ user: { id: "user-1" } }) }));

jest.mock("@/services/groups-api", () => ({
  ...jest.requireActual("@/services/groups-api"),
  regenerateInviteCode: jest.fn(),
  addMember: jest.fn(),
  promoteMember: jest.fn(),
  removeMember: jest.fn(),
  leaveGroup: jest.fn(),
}));

const mockRegenerate = regenerateInviteCode as jest.MockedFunction<typeof regenerateInviteCode>;

function makeGroup(overrides: Partial<GroupDetail> = {}): GroupDetail {
  return {
    id: "group-1", name: "Corrida", description: null, starts_on: "2026-11-01", ends_on: null,
    ranking_criterion: "check_ins", status: "active", members_count: 1, my_role: "admin",
    invite_code: "K7P4M9X2",
    members: [{ user_id: "user-1", username: "pedro", role: "admin", joined_at: "2026-11-01T12:00:00Z" }],
    ...overrides,
  };
}

let alertSpy: jest.SpyInstance;
let shareSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
  shareSpy = jest.spyOn(Share, "share").mockResolvedValue({ action: "sharedAction" } as never);
  mockRegenerate.mockResolvedValue({ invite_code: "NEWCODE1" });
});

afterEach(() => { alertSpy.mockRestore(); shareSpy.mockRestore(); });

async function renderAbout(group: GroupDetail, onChanged = jest.fn()) {
  const view = await render(<GroupAbout group={group} colorOf={() => "#000"} onChanged={onChanged} />);
  return { onChanged, ...view };
}

describe("Código de convite", () => {
  it("só aparece para admin e somente quando invite_code não é null", async () => {
    const admin = await renderAbout(makeGroup());
    expect(admin.getByTestId("invite-card")).toBeTruthy();
    expect(admin.getByText("K7P4-M9X2")).toBeTruthy();

    const adminNull = await renderAbout(makeGroup({ invite_code: null }));
    expect(adminNull.queryByTestId("invite-card")).toBeNull();

    const member = await renderAbout(makeGroup({ my_role: "member", invite_code: null }));
    expect(member.queryByTestId("invite-card")).toBeNull();
  });

  it("compartilhar usa o menu do sistema e envia o texto do código, sem link", async () => {
    const { getByTestId } = await renderAbout(makeGroup());
    await fireEvent.press(getByTestId("share-invite-button"));

    expect(shareSpy).toHaveBeenCalled();
    const arg = shareSpy.mock.calls[0][0] as { message: string; url?: string; title?: string };
    expect(arg.message).toContain("K7P4-M9X2");
    expect(arg.url).toBeUndefined();
  });

  it("gerar novo código pede confirmação informando que o atual deixará de funcionar", async () => {
    const { getByText, onChanged } = await renderAbout(makeGroup());
    await fireEvent.press(getByText("Gerar novo"));

    expect(alertSpy).toHaveBeenCalled();
    const message = String(alertSpy.mock.calls[alertSpy.mock.calls.length - 1][1]);
    expect(message).toContain("deixa de funcionar");

    // confirma -> POST /groups/{id}/invite/regenerate + recarrega
    const buttons = alertSpy.mock.calls[alertSpy.mock.calls.length - 1][2] as { text: string; onPress?: () => void }[];
    await buttons.find((b) => b.text === "Gerar")?.onPress?.();
    await new Promise((r) => setTimeout(r, 0));

    expect(mockRegenerate).toHaveBeenCalledWith("group-1");
    expect(onChanged).toHaveBeenCalled();
  });
});
