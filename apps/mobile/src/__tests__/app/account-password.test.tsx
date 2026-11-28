import { fireEvent, render, waitFor } from "@testing-library/react-native";
import ChangePasswordScreen from "@/app/(app)/account/password";
import { useSession } from "@/hooks/useSession";
import { ApiError } from "@/services/api";
import { changePassword } from "@/services/auth-api";
import type { TokenResponse } from "@/services/types/auth";

jest.mock("expo-router", () => ({
  router: { back: jest.fn() },
}));

jest.mock("@/hooks/useSession", () => ({
  useSession: jest.fn(),
}));

jest.mock("@/services/auth-api", () => ({
  ...jest.requireActual("@/services/auth-api"),
  changePassword: jest.fn(),
}));

const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;
const mockChangePassword = changePassword as jest.MockedFunction<
  typeof changePassword
>;
const { router } = jest.requireMock("expo-router");

const tokens: TokenResponse = {
  access_token: "novo-access",
  refresh_token: "novo-refresh",
  exp: 1_800_000_000,
};

const signOut = jest.fn();

function mockSession(replaceTokens = jest.fn().mockResolvedValue(undefined)) {
  mockUseSession.mockReturnValue({
    user: {
      id: "usr-123",
      name: "João Silva",
      username: "joaosilva",
      email: "joao@example.com",
    },
    session: { accessToken: "token", refreshToken: "refresh", exp: 1 },
    isLoading: false,
    signIn: jest.fn(),
    signUp: jest.fn(),
    signOut,
    refreshSession: jest.fn(),
    updateUser: jest.fn(),
    replaceTokens,
  });
  return replaceTokens;
}

async function fill(
  screen: Awaited<ReturnType<typeof render>>,
  values: {
    current?: string;
    next?: string;
    confirmation?: string;
  },
) {
  if (values.current !== undefined) {
    await fireEvent.changeText(
      screen.getByTestId("password-current-input"),
      values.current,
    );
  }
  if (values.next !== undefined) {
    await fireEvent.changeText(
      screen.getByTestId("password-new-input"),
      values.next,
    );
  }
  if (values.confirmation !== undefined) {
    await fireEvent.changeText(
      screen.getByTestId("password-confirmation-input"),
      values.confirmation,
    );
  }
}

beforeEach(() => {
  jest.clearAllMocks();
  mockChangePassword.mockResolvedValue(tokens);
});

describe("ChangePasswordScreen", () => {
  it("requires at least 8 characters", async () => {
    mockSession();
    const screen = await render(<ChangePasswordScreen />);

    await fill(screen, {
      current: "senha-atual",
      next: "1234567",
      confirmation: "1234567",
    });
    await fireEvent.press(screen.getByTestId("password-submit-button"));

    expect(await screen.findByText("Use pelo menos 8 caracteres.")).toBeTruthy();
    expect(mockChangePassword).not.toHaveBeenCalled();
  });

  it("rejects a new password above 72 UTF-8 bytes", async () => {
    mockSession();
    const screen = await render(<ChangePasswordScreen />);

    // 73 caracteres ASCII = 73 bytes
    const longPassword = "a".repeat(73);
    await fill(screen, {
      current: "senha-atual",
      next: longPassword,
      confirmation: longPassword,
    });
    await fireEvent.press(screen.getByTestId("password-submit-button"));

    expect(await screen.findByText("Use no máximo 72 bytes.")).toBeTruthy();
    expect(mockChangePassword).not.toHaveBeenCalled();
  });

  it("counts UTF-8 bytes, not characters", async () => {
    mockSession();
    const screen = await render(<ChangePasswordScreen />);

    // "á" ocupa 2 bytes: 40 caracteres = 80 bytes
    const accented = "á".repeat(40);
    await fill(screen, {
      current: "senha-atual",
      next: accented,
      confirmation: accented,
    });
    await fireEvent.press(screen.getByTestId("password-submit-button"));

    expect(await screen.findByText("Use no máximo 72 bytes.")).toBeTruthy();
  });

  it("requires the confirmation to match", async () => {
    mockSession();
    const screen = await render(<ChangePasswordScreen />);

    await fill(screen, {
      current: "senha-atual",
      next: "senha-nova",
      confirmation: "senha-diferente",
    });
    await fireEvent.press(screen.getByTestId("password-submit-button"));

    expect(
      await screen.findByText("A confirmação não confere com a nova senha."),
    ).toBeTruthy();
    expect(mockChangePassword).not.toHaveBeenCalled();
  });

  it("requires a new password different from the current one", async () => {
    mockSession();
    const screen = await render(<ChangePasswordScreen />);

    await fill(screen, {
      current: "mesma-senha",
      next: "mesma-senha",
      confirmation: "mesma-senha",
    });
    await fireEvent.press(screen.getByTestId("password-submit-button"));

    expect(
      await screen.findByText("A nova senha deve ser diferente da atual."),
    ).toBeTruthy();
    expect(mockChangePassword).not.toHaveBeenCalled();
  });

  it("sends the three fields and replaces both tokens before leaving", async () => {
    const replaceTokens = mockSession();
    const screen = await render(<ChangePasswordScreen />);

    await fill(screen, {
      current: "senha-atual",
      next: "senha-nova-123",
      confirmation: "senha-nova-123",
    });
    await fireEvent.press(screen.getByTestId("password-submit-button"));

    await waitFor(() => {
      expect(mockChangePassword).toHaveBeenCalledWith({
        current_password: "senha-atual",
        new_password: "senha-nova-123",
        new_password_confirmation: "senha-nova-123",
      });
    });
    await waitFor(() => {
      expect(replaceTokens).toHaveBeenCalledWith(tokens);
    });
    expect(replaceTokens.mock.invocationCallOrder[0]).toBeLessThan(
      router.back.mock.invocationCallOrder[0],
    );
    expect(signOut).not.toHaveBeenCalled();
  });

  it("shows a 400 on the current password field without logging out", async () => {
    const replaceTokens = mockSession();
    mockChangePassword.mockRejectedValueOnce(
      new ApiError("Senha atual incorreta.", 400, {
        detail: "Senha atual incorreta.",
      }),
    );
    const screen = await render(<ChangePasswordScreen />);

    await fill(screen, {
      current: "errada",
      next: "senha-nova-123",
      confirmation: "senha-nova-123",
    });
    await fireEvent.press(screen.getByTestId("password-submit-button"));

    expect(await screen.findByText("Senha atual incorreta.")).toBeTruthy();
    expect(screen.getByTestId("password-current-input")).toBeTruthy();
    expect(replaceTokens).not.toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();
    expect(router.back).not.toHaveBeenCalled();
  });

  it("maps body-level 422 messages to the right fields", async () => {
    mockSession();
    mockChangePassword.mockRejectedValueOnce(
      new ApiError("Erro de validação.", 422, {
        detail: [
          {
            loc: ["body"],
            msg: "Value error, A confirmação não confere com a nova senha.",
          },
        ],
      }),
    );
    const screen = await render(<ChangePasswordScreen />);

    await fill(screen, {
      current: "senha-atual",
      next: "senha-nova-123",
      confirmation: "senha-nova-123",
    });
    await fireEvent.press(screen.getByTestId("password-submit-button"));

    expect(
      await screen.findByText("A confirmação não confere com a nova senha."),
    ).toBeTruthy();
  });
});
