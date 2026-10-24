import * as SecureStore from "expo-secure-store";
import {
  clearTokens,
  getTokens,
  type StoredTokens,
  saveTokens,
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
  it("should call setItemAsync with the correct key and the serialized value in JSON", async () => {
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
  it("should return StoredTokens when the storage contains valid JSON", async () => {
    mockedSecureStore.getItemAsync.mockResolvedValueOnce(
      JSON.stringify(mockTokens),
    );

    const result = await getTokens();

    expect(result).toEqual(mockTokens);
    expect(mockedSecureStore.getItemAsync).toHaveBeenCalledWith(TOKENS_KEY);
  });

  it("should return null when there is no data in the storage", async () => {
    mockedSecureStore.getItemAsync.mockResolvedValueOnce(null);

    const result = await getTokens();

    expect(result).toBeNull();
  });

  it("should return null and clear the storage when the JSON is corrupted", async () => {
    mockedSecureStore.getItemAsync.mockResolvedValueOnce("{ invalid json {{");
    mockedSecureStore.deleteItemAsync.mockResolvedValueOnce();

    const result = await getTokens();

    expect(result).toBeNull();
    expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalledWith(TOKENS_KEY);
  });
});

describe("clearTokens", () => {
  it("should call deleteItemAsync with the correct key", async () => {
    mockedSecureStore.deleteItemAsync.mockResolvedValueOnce();

    await clearTokens();

    expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalledTimes(1);
    expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalledWith(TOKENS_KEY);
  });
});
