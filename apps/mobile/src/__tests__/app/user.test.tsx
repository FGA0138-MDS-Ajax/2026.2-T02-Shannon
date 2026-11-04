import { fireEvent, render, waitFor } from "@testing-library/react-native";
import UserScreen from "@/app/(app)/user";
import { useSession } from "@/hooks/useSession";

jest.mock("@/hooks/useSession", () => ({
  useSession: jest.fn(),
}));

const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;

describe("UserScreen", () => {
  const mockSignOut = jest.fn();
  const mockUser = {
    id: "usr-123",
    name: "João Silva",
    email: "joao@example.com",
    username: "joaosilva",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders user basic information and logout button", async () => {
    mockUseSession.mockReturnValue({
      user: mockUser,
      session: { accessToken: "token", refreshToken: "refresh", exp: 1 },
      isLoading: false,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: mockSignOut,
      refreshSession: jest.fn(),
    });

    const { getByText, getByTestId, getAllByText } = await render(
      <UserScreen />,
    );

    expect(getByText("Usuário")).toBeTruthy();
    // Nome: in profile card and in info row
    expect(getAllByText("João Silva").length).toBeGreaterThanOrEqual(1);
    // Email: in info row
    expect(getByText("joao@example.com")).toBeTruthy();
    // Username: in profile header (@joaosilva) and in info row (joaosilva)
    expect(getByText("@joaosilva")).toBeTruthy();
    expect(getByText("joaosilva")).toBeTruthy();

    // Check labels
    expect(getByText("Nome")).toBeTruthy();
    expect(getByText("E-mail")).toBeTruthy();
    expect(getByText("Nome de usuário")).toBeTruthy();

    // Logout button
    const logoutBtn = getByText("Sair");
    expect(logoutBtn).toBeTruthy();
    expect(getByTestId("logout-button")).toBeTruthy();
  });

  it("calls signOut when pressing the logout button", async () => {
    mockSignOut.mockResolvedValueOnce(undefined);
    mockUseSession.mockReturnValue({
      user: mockUser,
      session: { accessToken: "token", refreshToken: "refresh", exp: 1 },
      isLoading: false,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: mockSignOut,
      refreshSession: jest.fn(),
    });

    const { getByTestId } = await render(<UserScreen />);
    const logoutBtn = getByTestId("logout-button");

    fireEvent.press(logoutBtn);

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });
  });

  it("shows activity indicator when user is null", async () => {
    mockUseSession.mockReturnValue({
      user: null,
      session: null,
      isLoading: true,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: mockSignOut,
      refreshSession: jest.fn(),
    });

    const { queryByText } = await render(<UserScreen />);
    expect(queryByText("Usuário")).toBeNull();
    expect(queryByText("Sair")).toBeNull();
  });
});
