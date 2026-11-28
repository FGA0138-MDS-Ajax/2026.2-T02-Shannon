import { Alert } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";
import GroupMembers, { leaveMessage } from "@/components/groups/group-members";
import { router } from "expo-router";
import { ApiError } from "@/services/api";
import { addMember, leaveGroup, promoteMember, removeMember } from "@/services/groups-api";
import type { GroupDetail, GroupMember } from "@/services/types/groups";

jest.mock("expo-router", () => ({ router: { back: jest.fn(), push: jest.fn(), replace: jest.fn() } }));

jest.mock("@/hooks/useSession", () => ({ useSession: () => ({ user: { id: "user-1" } }) }));

jest.mock("@/services/groups-api", () => ({
  addMember: jest.fn(),
  promoteMember: jest.fn(),
  removeMember: jest.fn(),
  leaveGroup: jest.fn(),
}));

const mockAdd = addMember as jest.MockedFunction<typeof addMember>;
const mockPromote = promoteMember as jest.MockedFunction<typeof promoteMember>;
const mockRemove = removeMember as jest.MockedFunction<typeof removeMember>;
const mockLeave = leaveGroup as jest.MockedFunction<typeof leaveGroup>;

const meAdmin: GroupMember = { user_id: "user-1", username: "pedro", role: "admin", joined_at: "2026-11-01T12:00:00Z" };
const otherMember: GroupMember = { user_id: "user-2", username: "ana", role: "member", joined_at: "2026-11-02T12:00:00Z" };
const otherAdmin: GroupMember = { user_id: "user-3", username: "bia", role: "admin", joined_at: "2026-11-01T12:00:00Z" };

function makeGroup(overrides: Partial<GroupDetail> = {}): GroupDetail {
  return {
    id: "group-1", name: "Corrida", description: null, starts_on: "2026-11-01", ends_on: null,
    ranking_criterion: "check_ins", status: "active", members_count: 2, my_role: "admin",
    invite_code: "K7P4M9X2", members: [meAdmin, otherMember], ...overrides,
  };
}

let alertSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
});

afterEach(() => alertSpy.mockRestore());

async function renderMembers(group: GroupDetail, onChanged = jest.fn()) {
  const view = await render(<GroupMembers group={group} colorOf={() => "#000"} onChanged={onChanged} />);
  return { onChanged, ...view };
}

/** Captura os botões do Alert atual e dispara o `onPress` do botão de confirmar. */
async function pressAlertButton(text: string) {
  const calls = alertSpy.mock.calls;
  const buttons = calls[calls.length - 1]?.[2] as { text: string; onPress?: () => void }[] | undefined;
  const button = buttons?.find((b) => b.text === text);
  if (!button?.onPress) throw new Error(`botão ${text} não encontrado`);
  const result: unknown = button.onPress();
  if (result && typeof (result as Promise<unknown>).then === "function") await result;
  // `useAsyncAction` roda em startTransition: dá um tick para concluir
  await new Promise((r) => setTimeout(r, 0));
  return result;
}

describe("adicionar membro", () => {
  it("POST /groups/{id}/members envia { username } e recarrega o detalhe", async () => {
    mockAdd.mockResolvedValue(otherMember);
    const { getByTestId, onChanged } = await renderMembers(makeGroup());

    await fireEvent.changeText(getByTestId("add-member-input"), "ana");
    await fireEvent.press(getByTestId("add-member-button"));

    expect(mockAdd).toHaveBeenCalledWith("group-1", "ana");
    expect(onChanged).toHaveBeenCalled();
  });

  it("404 mostra a mensagem da API", async () => {
    mockAdd.mockRejectedValue(new ApiError("Usuário não encontrado.", 404, { detail: "Usuário não encontrado." }));
    const screen = await renderMembers(makeGroup());

    await fireEvent.changeText(screen.getByTestId("add-member-input"), "zzz");
    await fireEvent.press(screen.getByTestId("add-member-button"));

    // 404 mostra a mensagem da API (no campo)
    expect(await screen.findByText("Usuário não encontrado.")).toBeTruthy();
  });

  it("409 mostra a mensagem da API", async () => {
    mockAdd.mockRejectedValue(new ApiError("Já participa deste grupo.", 409, { detail: "Já participa deste grupo." }));
    const screen = await renderMembers(makeGroup());

    await fireEvent.changeText(screen.getByTestId("add-member-input"), "ana");
    await fireEvent.press(screen.getByTestId("add-member-button"));

    expect(await screen.findByText("Já participa deste grupo.")).toBeTruthy();
  });

  it("só admin vê adicionar membro", async () => {
    const { queryByTestId } = await renderMembers(makeGroup({ my_role: "member", invite_code: null }));
    expect(queryByTestId("add-member-input")).toBeNull();
  });
});

describe("promover membro", () => {
  it("chama promote só para membro com papel member", async () => {
    mockPromote.mockResolvedValue({ ...otherMember, role: "admin" });
    const { getByTestId, onChanged } = await renderMembers(makeGroup());

    await fireEvent.press(getByTestId("member-ana"));
    await pressAlertButton("Promover a admin");

    expect(mockPromote).toHaveBeenCalledWith("group-1", "user-2");
    expect(onChanged).toHaveBeenCalled();
  });

  it("não oferece promover para admin", async () => {
    // admin (user-3) não recebe opção "Promover a admin"
    const { getByTestId } = await renderMembers(makeGroup({ members: [meAdmin, otherAdmin], members_count: 2 }));
    await fireEvent.press(getByTestId("member-bia"));
    const calls = alertSpy.mock.calls;
    const buttons = calls[calls.length - 1]?.[2] as { text: string }[] | undefined;
    expect(buttons?.some((b) => b.text === "Promover a admin")).toBe(false);
    expect(buttons?.some((b) => b.text === "Remover do grupo")).toBe(true);
  });

  it.each([403, 404, 409])("erro %i mostra a mensagem da API", async (status) => {
    mockPromote.mockRejectedValue(new ApiError(`Erro ${status}.`, status, { detail: `Erro ${status}.` }));
    const { getByTestId } = await renderMembers(makeGroup());

    await fireEvent.press(getByTestId("member-ana"));
    await pressAlertButton("Promover a admin");

    expect(alertSpy).toHaveBeenCalledWith(expect.any(String), `Erro ${status}.`);
  });
});

describe("remover membro", () => {
  async function openRemoveConfirm(getByTestId: (id: string) => unknown) {
    await fireEvent.press(getByTestId("member-ana") as never);
    await pressAlertButton("Remover do grupo"); // abre confirmação
  }

  it("pede confirmação antes de executar DELETE", async () => {
    mockRemove.mockResolvedValue(undefined);
    const { getByTestId, onChanged } = await renderMembers(makeGroup());

    await openRemoveConfirm(getByTestId);
    // DELETE ainda não foi chamado antes da confirmação
    expect(mockRemove).not.toHaveBeenCalled();
    await pressAlertButton("Remover"); // confirma

    expect(mockRemove).toHaveBeenCalledWith("group-1", "user-2");
    expect(onChanged).toHaveBeenCalled();
  });

  it("não aparece para o próprio usuário", async () => {
    const { getByTestId } = await renderMembers(makeGroup());
    await fireEvent.press(getByTestId("member-pedro"));
    expect(mockRemove).not.toHaveBeenCalled();
  });

  it("cancelar cancela corretamente", async () => {
    const { getByTestId } = await renderMembers(makeGroup());
    await openRemoveConfirm(getByTestId);
    const calls = alertSpy.mock.calls;
    const buttons = calls[calls.length - 1]?.[2] as { text: string; onPress?: () => void }[] | undefined;
    expect(buttons?.some((b) => b.text === "Cancelar")).toBe(true);
    // Não confirmar não remove
    expect(mockRemove).not.toHaveBeenCalled();
  });

  it.each([403, 404, 409])("erro %i mostra a mensagem da API", async (status) => {
    mockRemove.mockRejectedValue(new ApiError(`Erro ${status}.`, status, { detail: `Erro ${status}.` }));
    const { getByTestId } = await renderMembers(makeGroup());

    await openRemoveConfirm(getByTestId);
    await pressAlertButton("Remover");

    await new Promise((r) => setTimeout(r, 0));
    expect(alertSpy).toHaveBeenCalledWith(expect.any(String), `Erro ${status}.`);
  });
});

describe("sair do grupo", () => {
  it("leaveMessage monta os textos corretos", () => {
    expect(leaveMessage({ group_deleted: true, promoted_user_id: null }, [])).toBe("Grupo apagado");
    expect(leaveMessage({ group_deleted: false, promoted_user_id: null }, [])).toBe("Você saiu do grupo");
    expect(leaveMessage({ group_deleted: false, promoted_user_id: "user-2" }, [otherMember])).toBe("ana agora é admin");
  });

  async function confirmLeave() {
    const calls = alertSpy.mock.calls;
    const buttons = calls[calls.length - 1]?.[2] as { text: string; onPress?: () => void }[] | undefined;
    await buttons?.find((b) => b.text === "Sair")?.onPress?.();
  }

  // ÚNICO INTEGRANTE
  it("único integrante: botão 'Sair e apagar o grupo' + 'Grupo apagado' + volta e recarrega", async () => {
    mockLeave.mockResolvedValue({ group_deleted: true, promoted_user_id: null });
    const { getByTestId, getByText } = await renderMembers(makeGroup({ members: [meAdmin], members_count: 1 }));

    expect(getByText("Sair e apagar o grupo")).toBeTruthy();

    await fireEvent.press(getByTestId("leave-group-button"));
    // aviso de que o grupo será apagado
    expect(alertSpy.mock.calls.some((c) => String(c[1] ?? "").includes("apagado"))).toBe(true);
    await confirmLeave();

    expect(mockLeave).toHaveBeenCalledWith("group-1");
    expect(alertSpy).toHaveBeenCalledWith("Grupo apagado");
    expect(router.back).toHaveBeenCalled();
  });

  // ÚNICO ADMIN COM OUTROS MEMBROS
  it("único admin com outros membros: 'Sair do grupo' + aviso + 'X agora é admin'", async () => {
    mockLeave.mockResolvedValue({ group_deleted: false, promoted_user_id: "user-2" });
    const { getByTestId, getByText } = await renderMembers(makeGroup({ members: [meAdmin, otherMember], members_count: 2 }));

    expect(getByText("Sair do grupo")).toBeTruthy();

    await fireEvent.press(getByTestId("leave-group-button"));
    // aviso: o membro mais antigo assume como admin
    expect(alertSpy.mock.calls.some((c) => String(c[1] ?? "").includes("admin"))).toBe(true);
    await confirmLeave();

    expect(alertSpy).toHaveBeenCalledWith("ana agora é admin");
    expect(router.back).toHaveBeenCalled();
  });

  // DEMAIS CASOS
  it("demais casos: 'Sair do grupo' + 'Você saiu do grupo' + volta e recarrega", async () => {
    mockLeave.mockResolvedValue({ group_deleted: false, promoted_user_id: null });
    const { getByTestId, getByText } = await renderMembers(makeGroup({ members: [meAdmin, otherAdmin, otherMember], members_count: 3 }));

    expect(getByText("Sair do grupo")).toBeTruthy();
    await fireEvent.press(getByTestId("leave-group-button"));
    await confirmLeave();

    expect(alertSpy).toHaveBeenCalledWith("Você saiu do grupo");
    expect(router.back).toHaveBeenCalled();
  });

  it.each([403, 404, 409])("erro %i mostra a mensagem da API e não sai da tela", async (status) => {
    mockLeave.mockRejectedValue(new ApiError(`Erro ${status}.`, status, { detail: `Erro ${status}.` }));
    const { getByTestId } = await renderMembers(makeGroup());

    await fireEvent.press(getByTestId("leave-group-button"));
    await confirmLeave();

    expect(alertSpy).toHaveBeenCalledWith(expect.any(String), `Erro ${status}.`);
    expect(router.back).not.toHaveBeenCalled();
  });
});
