import { request } from "@/services/api";
import {
  authKeys,
  changePassword,
  getAccount,
  getProfile,
  updateAccount,
} from "@/services/auth-api";

jest.mock("@/services/api", () => ({
  ...jest.requireActual("@/services/api"),
  request: jest.fn(),
}));

const mockRequest = request as jest.MockedFunction<typeof request>;

beforeEach(() => {
  jest.clearAllMocks();
  mockRequest.mockResolvedValue({} as never);
});

describe("auth-api", () => {
  it("busca o resumo do perfil em /user/statistics/profile", async () => {
    await getProfile();

    expect(mockRequest).toHaveBeenCalledWith(authKeys.profile);
    expect(authKeys.profile).toBe("/user/statistics/profile");
  });

  it("busca a conta atual em /auth/session/me", async () => {
    await getAccount();

    expect(mockRequest).toHaveBeenCalledWith("/auth/session/me");
  });

  it("envia só os campos recebidos no PATCH da conta", async () => {
    await updateAccount({ name: "Maria" });

    expect(mockRequest).toHaveBeenCalledWith("/auth/session/me", {
      method: "PATCH",
      body: JSON.stringify({ name: "Maria" }),
    });
  });

  it("envia a senha atual junto quando o e-mail muda", async () => {
    await updateAccount({
      email: "maria@example.com",
      current_password: "atual",
    });

    expect(mockRequest).toHaveBeenCalledWith("/auth/session/me", {
      method: "PATCH",
      body: JSON.stringify({
        email: "maria@example.com",
        current_password: "atual",
      }),
    });
  });

  it("troca a senha com PUT no campo certo e devolve os tokens", async () => {
    const tokens = {
      access_token: "a",
      refresh_token: "r",
      exp: 123,
    };
    mockRequest.mockResolvedValueOnce(tokens);

    await expect(
      changePassword({
        current_password: "atual",
        new_password: "nova-senha",
        new_password_confirmation: "nova-senha",
      }),
    ).resolves.toBe(tokens);

    expect(mockRequest).toHaveBeenCalledWith("/auth/session/me/password", {
      method: "PUT",
      body: JSON.stringify({
        current_password: "atual",
        new_password: "nova-senha",
        new_password_confirmation: "nova-senha",
      }),
    });
  });
});
