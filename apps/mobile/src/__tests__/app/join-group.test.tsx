import { fireEvent, render } from "@testing-library/react-native";
import { router } from "expo-router";
import { SWRConfig } from "swr";
import JoinGroupScreen from "@/app/(app)/groups/join";
import { ApiError, request } from "@/services/api";
import { joinGroup, previewGroup } from "@/services/groups-api";
import { normalizeInviteCode } from "@/services/groups-api";
import type { GroupDetail, GroupPreview } from "@/services/types/groups";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => ({}),
  useFocusEffect: () => {},
}));

jest.mock("@/services/api", () => ({
  ...jest.requireActual("@/services/api"),
  request: jest.fn(),
}));

jest.mock("@/services/groups-api", () => ({
  ...jest.requireActual("@/services/groups-api"),
  previewGroup: jest.fn(),
  joinGroup: jest.fn(),
}));

const mockPreview = previewGroup as jest.MockedFunction<typeof previewGroup>;
const mockJoin = joinGroup as jest.MockedFunction<typeof joinGroup>;
const mockRequest = request as jest.MockedFunction<typeof request>;

const preview: GroupPreview = {
  id: "group-1",
  name: "Corrida matinal",
  members_count: 3,
  status: "active",
};

const joined: GroupDetail = {
  id: "group-1",
  name: "Corrida matinal",
  description: null,
  starts_on: "2026-11-01",
  ends_on: null,
  ranking_criterion: "check_ins",
  status: "active",
  members_count: 4,
  my_role: "member",
  invite_code: null,
  members: [],
};

function renderScreen() {
  return render(
    <SWRConfig value={{ provider: () => new Map(), shouldRetryOnError: false }}>
      <JoinGroupScreen />
    </SWRConfig>,
  );
}

async function typeCode(screen: Awaited<ReturnType<typeof render>>, text: string) {
  await fireEvent.changeText(screen.getByTestId("invite-code-input"), text);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRequest.mockResolvedValue([]); // GET /groups para verificar participação
});

describe("normalização do código", () => {
  it("minúsculas, espaços e hífens viram K7P4M9X2", () => {
    expect(normalizeInviteCode("k7p4-m9x2")).toBe("K7P4M9X2");
    expect(normalizeInviteCode(" k7p4 m9x2 ")).toBe("K7P4M9X2");
    expect(normalizeInviteCode("k7p4-m9x2")).toBe("K7P4M9X2");
    expect(normalizeInviteCode("K7P4 M9X2")).toBe("K7P4M9X2");
  });

  it("usuário pode digitar em minúsculas, com espaços ou hífens", async () => {
    mockPreview.mockResolvedValue(preview);
    const screen = await renderScreen();

    await typeCode(screen, "k7p4-m9x2");
    await fireEvent.press(screen.getByTestId("preview-button"));

    expect(mockPreview).toHaveBeenCalledWith("k7p4-m9x2");
  });
});

describe("fluxo em dois passos", () => {
  it("GET /groups/invite/{code} mostra nome e número de membros antes de entrar", async () => {
    mockPreview.mockResolvedValue(preview);
    const screen = await renderScreen();

    await typeCode(screen, "k7p4-m9x2");
    await fireEvent.press(screen.getByTestId("preview-button"));

    expect(await screen.findByText("Corrida matinal")).toBeTruthy();
    expect(screen.getByText("3/30 integrantes")).toBeTruthy();
    expect(screen.getByTestId("join-button")).toBeTruthy();
  });

  it("grupo encerrado na prévia mostra o aviso", async () => {
    mockPreview.mockResolvedValue({ ...preview, status: "ended" });
    const screen = await renderScreen();

    await typeCode(screen, "K7P4M9X2");
    await fireEvent.press(screen.getByTestId("preview-button"));

    expect(await screen.findByText("Encerrado")).toBeTruthy();
  });

  it("POST /groups/join envia o código normalizado no corpo", async () => {
    mockPreview.mockResolvedValue(preview);
    mockJoin.mockResolvedValue(joined);
    const screen = await renderScreen();

    await typeCode(screen, "k7p4 m9x2");
    await fireEvent.press(screen.getByTestId("preview-button"));
    await fireEvent.press(await screen.findByTestId("join-button"));

    expect(mockJoin).toHaveBeenCalledWith("k7p4 m9x2");
    // em sucesso (201) abre o grupo retornado pela API
    expect(router.replace).toHaveBeenCalledWith("/groups/group-1");
  });
});

describe("erros", () => {
  async function tryPreview(rejection: unknown) {
    mockPreview.mockRejectedValue(rejection);
    const screen = await renderScreen();
    await typeCode(screen, "XXXXXXXX");
    await fireEvent.press(screen.getByTestId("preview-button"));
    return screen;
  }

  it("404 inválido mostra 'Código de convite inválido.' no campo", async () => {
    const screen = await tryPreview(
      new ApiError("Código de convite inválido.", 404, { detail: "Código de convite inválido." }),
    );
    expect(await screen.findByText("Código de convite inválido.")).toBeTruthy();
    expect(screen.queryByTestId("join-button")).toBeNull();
  });

  it("409 Grupo encerrado mostra a mensagem da API", async () => {
    // 409 na prévia... aqui simulamos no join
    mockPreview.mockResolvedValue(preview);
    mockJoin.mockRejectedValue(new ApiError("Grupo encerrado.", 409, { detail: "Grupo encerrado." }));
    const screen = await renderScreen();
    await typeCode(screen, "K7P4M9X2");
    await fireEvent.press(screen.getByTestId("preview-button"));
    await fireEvent.press(await screen.findByTestId("join-button"));
    expect(await screen.findByText("Grupo encerrado.")).toBeTruthy();
  });

  it("409 Você já participa deste grupo mostra a mensagem da API", async () => {
    mockPreview.mockResolvedValue(preview);
    mockJoin.mockRejectedValue(
      new ApiError("Você já participa deste grupo.", 409, { detail: "Você já participa deste grupo." }),
    );
    const screen = await renderScreen();
    await typeCode(screen, "K7P4M9X2");
    await fireEvent.press(screen.getByTestId("preview-button"));
    await fireEvent.press(await screen.findByTestId("join-button"));
    expect(await screen.findByText("Você já participa deste grupo.")).toBeTruthy();
  });

  it("quando já é membro, oferece abrir o grupo", async () => {
    mockPreview.mockResolvedValue(preview);
    mockRequest.mockResolvedValue([
      { id: "group-1", name: "Corrida matinal", members_count: 3, my_role: "member", status: "active", ends_on: null, ranking_criterion: "check_ins" },
    ]);
    const screen = await renderScreen();
    await typeCode(screen, "K7P4M9X2");
    await fireEvent.press(screen.getByTestId("preview-button"));
    await fireEvent.press(await screen.findByTestId("open-group-button"));
    expect(router.replace).toHaveBeenCalledWith("/groups/group-1");
  });

  it("409 Grupo cheio mostra 'Grupo cheio.' ou a mensagem da API", async () => {
    mockPreview.mockResolvedValue(preview);
    mockJoin.mockRejectedValue(new ApiError("Grupo cheio.", 409, { detail: "Grupo cheio." }));
    const screen = await renderScreen();
    await typeCode(screen, "K7P4M9X2");
    await fireEvent.press(screen.getByTestId("preview-button"));
    await fireEvent.press(await screen.findByTestId("join-button"));
    expect(await screen.findByText("Grupo cheio.")).toBeTruthy();
  });
});
