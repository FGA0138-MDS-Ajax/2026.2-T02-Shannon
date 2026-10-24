import * as SecureStore from "expo-secure-store";
import {
  clearTokens,
  getTokens,
  saveTokens,
  type StoredTokens,
} from "@/services/token-storage";

jest.mock("expo-secure-store");

const mockedSecureStore = jest.mocked(SecureStore);

const TOKENS_KEY = "habbit.auth.tokens";

const mockTokens: StoredTokens = {
  accessToken: "access-abc",
  refreshToken: "refresh-xyz",
  exp: 9999999999,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("saveTokens", () => {
  it("TS-1: chama setItemAsync com a chave correta e o valor serializado em JSON", async () => {
    mockedSecureStore.setItemAsync.mockResolvedValueOnce();

    await saveTokens(mockTokens);

    expect(mockedSecureStore.setItemAsync).toHaveBeenCalledTimes(1);
    expect(mockedSecureStore.setItemAsync).toHaveBeenCalledWith(
      TOKENS_KEY,
      JSON.stringify(mockTokens),
    );
  });
});

describe("getTokens", () => {
  it("TS-2: retorna StoredTokens quando o storage contém JSON válido", async () => {
    mockedSecureStore.getItemAsync.mockResolvedValueOnce(
      JSON.stringify(mockTokens),
    );

    const result = await getTokens();

    expect(result).toEqual(mockTokens);
    expect(mockedSecureStore.getItemAsync).toHaveBeenCalledWith(TOKENS_KEY);
  });

  it("TS-3: retorna null quando não há dado no storage", async () => {
    mockedSecureStore.getItemAsync.mockResolvedValueOnce(null);

    const result = await getTokens();

    expect(result).toBeNull();
  });

  it("TS-4: retorna null e limpa o storage quando o JSON está corrompido", async () => {
    mockedSecureStore.getItemAsync.mockResolvedValueOnce("{ invalid json {{");
    mockedSecureStore.deleteItemAsync.mockResolvedValueOnce();

    const result = await getTokens();

    expect(result).toBeNull();
    expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalledWith(TOKENS_KEY);
  });
});

describe("clearTokens", () => {
  it("TS-5: chama deleteItemAsync com a chave correta", async () => {
    mockedSecureStore.deleteItemAsync.mockResolvedValueOnce();

    await clearTokens();

    expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalledTimes(1);
    expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalledWith(TOKENS_KEY);
  });
});
