import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { SWRConfig } from "swr";
import EditAccountScreen from "@/app/(app)/account/edit";
import { useSession } from "@/hooks/useSession";
import { ApiError } from "@/services/api";
import { getAccount, updateAccount } from "@/services/auth-api";
import type { UserPublic } from "@/services/types/auth";

jest.mock("expo-router", () => ({
  router: { back: jest.fn() },
}));

jest.mock("@/hooks/useSession", () => ({
  useSession: jest.fn(),
}));

jest.mock("@/services/auth-api", () => ({
  ...jest.requireActual("@/services/auth-api"),
  getAccount: jest.fn(),
  updateAccount: jest.fn(),
}));

const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;
const mockGetAccount = getAccount as jest.MockedFunction<typeof getAccount>;
const mockUpdateAccount = updateAccount as jest.MockedFunction<
  typeof updateAccount
>;
const { router } = jest.requireMock("expo-router");

const account: UserPublic = {
  id: "usr-123",
  name: "João Silva",
  username: "joaosilva",
  email: "joao@example.com",
};

function renderScreen() {
  return render(
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      <EditAccountScreen />
    </SWRConfig>,
  );
}

async function renderLoaded() {
  const screen = await renderScreen();
  screen.debug();
  await screen.findByDisplayValue("João Silva");
  return screen;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetAccount.mockResolvedValue(account);
  mockUpdateAccount.mockImplementation(async (changes) => ({
    ...account,
    ...changes,
  }));
  mockUseSession.mockReturnValue({
    user: account,
    session: { accessToken: "token", refreshToken: "refresh", exp: 1 },
    isLoading: false,
    signIn: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
    refreshSession: jest.fn(),
    updateUser: jest.fn(),
    replaceTokens: jest.fn(),
  });
});

describe("EditAccountScreen", () => {
  it("loads the current account and sends only the changed field", async () => {
    const screen = await renderLoaded();

    await fireEvent.changeText(
      screen.getByTestId("account-name-input"),
      "  João Silva Jr.  ",
    );
    await fireEvent.press(screen.getByTestId("account-submit-button"));

    await waitFor(() => {
      expect(mockUpdateAccount).toHaveBeenCalledWith({
        name: "João Silva Jr.",
      });
    });
    expect(mockUpdateAccount.mock.calls[0][0]).not.toHaveProperty("username");
    expect(mockUpdateAccount.mock.calls[0][0]).not.toHaveProperty("email");
  });

  it("does not call the API when nothing changed", async () => {
    const screen = await renderLoaded();

    await fireEvent.press(screen.getByTestId("account-submit-button"));

    expect(
      await screen.findByText("Nenhuma alteração para salvar."),
    ).toBeTruthy();
    expect(mockUpdateAccount).not.toHaveBeenCalled();
  });

  it("lowercases and trims the username before sending", async () => {
    const screen = await renderLoaded();

    await fireEvent.changeText(
      screen.getByTestId("account-username-input"),
      "  Joao.Silva_2  ",
    );
    await fireEvent.press(screen.getByTestId("account-username-confirm"));
    await fireEvent.press(screen.getByTestId("account-submit-button"));

    await waitFor(() => {
      expect(mockUpdateAccount).toHaveBeenCalledWith({
        username: "joao.silva_2",
      });
    });
  });

  it("asks for confirmation before freeing the old username", async () => {
    const screen = await renderLoaded();

    await fireEvent.changeText(
      screen.getByTestId("account-username-input"),
      "joao.novo",
    );
    await fireEvent.press(screen.getByTestId("account-submit-button"));

    expect(
      await screen.findByText(
        "Confirme que o username antigo ficará livre para outra pessoa.",
      ),
    ).toBeTruthy();
    expect(mockUpdateAccount).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByTestId("account-username-confirm"));
    await fireEvent.press(screen.getByTestId("account-submit-button"));

    await waitFor(() => {
      expect(mockUpdateAccount).toHaveBeenCalledWith({
        username: "joao.novo",
      });
    });
  });

  it("validates username length and allowed characters locally", async () => {
    const screen = await renderLoaded();

    await fireEvent.changeText(screen.getByTestId("account-username-input"), "ab");
    await fireEvent.press(screen.getByTestId("account-submit-button"));
    expect(await screen.findByText("Use de 3 a 30 caracteres.")).toBeTruthy();

    await fireEvent.changeText(
      screen.getByTestId("account-username-input"),
      "Joao Silva",
    );
    await fireEvent.press(screen.getByTestId("account-submit-button"));
    expect(
      await screen.findByText("Use apenas letras minúsculas, números, _ e ."),
    ).toBeTruthy();

    expect(mockUpdateAccount).not.toHaveBeenCalled();
  });

  it("requires the current password to change the e-mail", async () => {
    const screen = await renderLoaded();

    await fireEvent.changeText(
      screen.getByTestId("account-email-input"),
      "novo@example.com",
    );
    await fireEvent.press(screen.getByTestId("account-submit-button"));

    expect(
      await screen.findByText("Informe a senha atual para trocar o e-mail."),
    ).toBeTruthy();
    expect(mockUpdateAccount).not.toHaveBeenCalled();

    await fireEvent.changeText(
      screen.getByTestId("account-current-password-input"),
      "senha-atual",
    );
    await fireEvent.press(screen.getByTestId("account-submit-button"));

    await waitFor(() => {
      expect(mockUpdateAccount).toHaveBeenCalledWith({
        email: "novo@example.com",
        current_password: "senha-atual",
      });
    });
  });

  it("shows a wrong current password on the password field", async () => {
    const screen = await renderLoaded();
    mockUpdateAccount.mockRejectedValueOnce(
      new ApiError("Senha atual incorreta.", 400, {
        detail: "Senha atual incorreta.",
      }),
    );

    await fireEvent.changeText(
      screen.getByTestId("account-email-input"),
      "novo@example.com",
    );
    await fireEvent.changeText(
      screen.getByTestId("account-current-password-input"),
      "errada",
    );
    await fireEvent.press(screen.getByTestId("account-submit-button"));

    expect(
      await screen.findByText("Senha atual incorreta."),
    ).toBeTruthy();
    // O formulário continua aberto para corrigir a senha.
    expect(screen.getByTestId("account-current-password-input")).toBeTruthy();
  });

  it("shows 409 username and e-mail conflicts on the right fields", async () => {
    const screen = await renderLoaded();

    mockUpdateAccount.mockRejectedValueOnce(
      new ApiError("Username já cadastrado.", 409, {
        detail: "Username já cadastrado.",
      }),
    );
    await fireEvent.changeText(
      screen.getByTestId("account-username-input"),
      "ocupado",
    );
    await fireEvent.press(screen.getByTestId("account-username-confirm"));
    await fireEvent.press(screen.getByTestId("account-submit-button"));
    expect(await screen.findByText("Username já cadastrado.")).toBeTruthy();

    mockUpdateAccount.mockRejectedValueOnce(
      new ApiError("E-mail já cadastrado.", 409, {
        detail: "E-mail já cadastrado.",
      }),
    );
    await fireEvent.changeText(
      screen.getByTestId("account-email-input"),
      "ocupado@example.com",
    );
    await fireEvent.changeText(
      screen.getByTestId("account-current-password-input"),
      "senha-atual",
    );
    await fireEvent.press(screen.getByTestId("account-submit-button"));
    expect(await screen.findByText("E-mail já cadastrado.")).toBeTruthy();
  });

  it("shows a 422 validation error on the field pointed by loc", async () => {
    const screen = await renderLoaded();
    mockUpdateAccount.mockRejectedValueOnce(
      new ApiError("Erro de validação.", 422, {
        detail: [
          {
            loc: ["body", "username"],
            msg: "Value error, Username inválido.",
          },
        ],
      }),
    );

    await fireEvent.changeText(
      screen.getByTestId("account-username-input"),
      "valido",
    );
    await fireEvent.press(screen.getByTestId("account-username-confirm"));
    await fireEvent.press(screen.getByTestId("account-submit-button"));

    expect(await screen.findByText("Username inválido.")).toBeTruthy();
  });

  it("updates the session with the returned user without a new login", async () => {
    const updateUser = jest.fn();
    mockUseSession.mockReturnValue({
      user: account,
      session: { accessToken: "token", refreshToken: "refresh", exp: 1 },
      isLoading: false,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      refreshSession: jest.fn(),
      updateUser,
      replaceTokens: jest.fn(),
    });
    const updated = { ...account, name: "João Atualizado" };
    mockUpdateAccount.mockResolvedValueOnce(updated);
    const screen = await renderLoaded();

    await fireEvent.changeText(
      screen.getByTestId("account-name-input"),
      "João Atualizado",
    );
    await fireEvent.press(screen.getByTestId("account-submit-button"));

    await waitFor(() => {
      expect(updateUser).toHaveBeenCalledWith(updated);
    });
    expect(router.back).toHaveBeenCalledTimes(1);
  });
});
