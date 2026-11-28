import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { SWRConfig } from "swr";
import UserScreen from "@/app/(app)/(tabs)/user";
import { useSession } from "@/hooks/useSession";
import { ApiError } from "@/services/api";
import { getProfile } from "@/services/auth-api";
import type { UserProfile } from "@/services/types/auth";

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
  useFocusEffect: (effect: () => void) => {
    // A aba não foca no mount no teste: o efeito capturado é o refresh
    // disparado quando a tela volta ao foco.
    mockRefreshEffect = effect;
  },
}));

jest.mock("@/hooks/useSession", () => ({
  useSession: jest.fn(),
}));

jest.mock("@/services/auth-api", () => ({
  ...jest.requireActual("@/services/auth-api"),
  getProfile: jest.fn(),
}));

const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;
const mockGetProfile = getProfile as jest.MockedFunction<typeof getProfile>;
const { router } = jest.requireMock("expo-router");

let mockRefreshEffect: (() => void) | null = null;

const mockUser = {
  id: "usr-123",
  name: "João Silva",
  email: "joao@example.com",
  username: "joaosilva",
};

function makeProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: "usr-123",
    name: "João Silva",
    username: "joaosilva",
    activity_streak: { current: 5, best: 12 },
    check_ins_total: 42,
    ...overrides,
  };
}

function mockSession(user = mockUser) {
  mockUseSession.mockReturnValue({
    user,
    session: { accessToken: "token", refreshToken: "refresh", exp: 1 },
    isLoading: false,
    signIn: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
    refreshSession: jest.fn(),
    updateUser: jest.fn(),
    replaceTokens: jest.fn(),
  });
}

function renderScreen() {
  return render(
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      <UserScreen />
    </SWRConfig>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetProfile.mockResolvedValue(makeProfile());
});

describe("UserScreen", () => {
  it("renders user basic information and logout button", async () => {
    mockSession();

    const { getByText, getByTestId, getAllByText } = await renderScreen();

    expect(getByText("Usuário")).toBeTruthy();
    expect(getAllByText("João Silva").length).toBeGreaterThanOrEqual(1);
    expect(getByText("joao@example.com")).toBeTruthy();
    expect(getByText("@joaosilva")).toBeTruthy();
    expect(getByText("joaosilva")).toBeTruthy();

    expect(getByText("Nome")).toBeTruthy();
    expect(getByText("E-mail")).toBeTruthy();
    expect(getByText("Nome de usuário")).toBeTruthy();

    expect(getByText("Sair")).toBeTruthy();
    expect(getByTestId("logout-button")).toBeTruthy();
  });

  it("shows the profile summary numbers from the API", async () => {
    mockSession();

    const screen = await renderScreen();

    expect(await screen.findByText("5")).toBeTruthy();
    expect(screen.getByTestId("profile-current-streak")).toBeTruthy();
    expect(screen.getByTestId("profile-best-streak")).toBeTruthy();
    expect(screen.getByTestId("profile-check-ins-total")).toBeTruthy();
    expect(screen.getByText("12")).toBeTruthy();
    expect(screen.getByText("42")).toBeTruthy();
    expect(mockGetProfile).toHaveBeenCalledTimes(1);
  });

  it("shows zeros, not an error, for a new account", async () => {
    mockSession();
    mockGetProfile.mockResolvedValueOnce(
      makeProfile({
        activity_streak: { current: 0, best: 0 },
        check_ins_total: 0,
      }),
    );

    const screen = await renderScreen();

    expect(await screen.findByText("Sequência atual")).toBeTruthy();
    expect(screen.getAllByText("0")).toHaveLength(3);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByText("Tentar novamente")).toBeNull();
  });

  it("calls signOut when pressing the logout button", async () => {
    const signOut = jest.fn().mockResolvedValue(undefined);
    mockUseSession.mockReturnValue({
      user: mockUser,
      session: { accessToken: "token", refreshToken: "refresh", exp: 1 },
      isLoading: false,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut,
      refreshSession: jest.fn(),
      updateUser: jest.fn(),
      replaceTokens: jest.fn(),
    });

    const { getByTestId } = await renderScreen();
    fireEvent.press(getByTestId("logout-button"));

    await waitFor(() => {
      expect(signOut).toHaveBeenCalledTimes(1);
    });
  });

  it("navigates to account editing and password change", async () => {
    mockSession();

    const { getByTestId } = await renderScreen();
    await fireEvent.press(getByTestId("edit-account-button"));
    expect(router.push).toHaveBeenCalledWith("/account/edit");

    await fireEvent.press(getByTestId("change-password-button"));
    expect(router.push).toHaveBeenCalledWith("/account/password");
  });

  it("recarrega o resumo da perfil ao voltar para a aba", async () => {
    mockSession();

    const screen = await renderScreen();
    expect(await screen.findByText("5")).toBeTruthy();
    expect(mockGetProfile).toHaveBeenCalledTimes(1);

    // Simula o retorno da aba: o refresh do SWR dispara um novo GET.
    mockRefreshEffect?.();
    await waitFor(() => {
      expect(mockGetProfile).toHaveBeenCalledTimes(2);
    });
  });

  it("shows the profile error with a retry action", async () => {
    mockSession();
    mockGetProfile
      .mockRejectedValueOnce(new ApiError("Falha", 500))
      .mockResolvedValueOnce(makeProfile());

    const screen = await renderScreen();

    expect(
      await screen.findByText("Erro no servidor. Tente de novo em instantes."),
    ).toBeTruthy();

    fireEvent.press(screen.getByText("Tentar novamente"));

    await waitFor(() => {
      expect(mockGetProfile).toHaveBeenCalledTimes(2);
    });
  });

  it("shows activity indicator when user is null", async () => {
    mockUseSession.mockReturnValue({
      user: null,
      session: null,
      isLoading: true,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      refreshSession: jest.fn(),
      updateUser: jest.fn(),
      replaceTokens: jest.fn(),
    });

    const { queryByText } = await renderScreen();
    expect(queryByText("Usuário")).toBeNull();
    expect(queryByText("Sair")).toBeNull();
  });
});
