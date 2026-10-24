import { faker } from "@faker-js/faker";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";
import { SessionProvider, useSession } from "@/contexts/auth-context";
import { api, type SignupRequest } from "@/services/api";

jest.setTimeout(30_000);

jest.mock("expo-secure-store", () => {
  const store: Record<string, string> = {};
  return {
    getItemAsync: jest.fn(async (key: string) => store[key] ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      store[key] = value;
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      delete store[key];
    }),
  };
});

function makeAccount(): SignupRequest {
  const suffix = faker.string.alphanumeric(12).toLowerCase();

  return {
    name: faker.person.fullName(),
    username: `user_${suffix}`,
    email: `user.${suffix}@example.com`,
    password: `${faker.internet.password({ length: 16 })}A1!`,
  };
}

function wrapper({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}

function getSecureStore() {
  return jest.requireMock("expo-secure-store");
}

async function waitForLoadedSession() {
  const hook = await renderHook(() => useSession(), { wrapper });
  await waitFor(() => expect(hook.result.current.isLoading).toBe(false));
  return hook;
}

beforeEach(() => {
  jest.clearAllMocks();
  getSecureStore().getItemAsync.mockResolvedValue(null);
});

describe("SessionProvider", () => {
  it("should end with user=null when there are no tokens in the storage", async () => {
    const { result } = await waitForLoadedSession();

    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
  });

  it("should restore session when the stored tokens are valid", async () => {
    const signup = await api.signup(makeAccount());
    getSecureStore().getItemAsync.mockResolvedValue(
      JSON.stringify({
        accessToken: signup.token.access_token,
        refreshToken: signup.token.refresh_token,
        exp: signup.token.exp,
      }),
    );

    const { result } = await waitForLoadedSession();

    expect(result.current.user).toEqual(signup.user);
    expect(result.current.session).toMatchObject({
      accessToken: signup.token.access_token,
      refreshToken: signup.token.refresh_token,
    });
  });

  it("should refresh an invalid access token when the refresh token is valid", async () => {
    const signup = await api.signup(makeAccount());
    getSecureStore().getItemAsync.mockResolvedValue(
      JSON.stringify({
        accessToken: "invalid-access-token",
        refreshToken: signup.token.refresh_token,
        exp: 1,
      }),
    );

    const { result } = await waitForLoadedSession();

    expect(result.current.user).toEqual(signup.user);
    expect(result.current.session?.accessToken).not.toBe("invalid-access-token");
  });

  it("should clear the session when both access and refresh tokens are invalid", async () => {
    getSecureStore().getItemAsync.mockResolvedValue(
      JSON.stringify({
        accessToken: "invalid-access-token",
        refreshToken: "invalid-refresh-token",
        exp: 1,
      }),
    );

    const { result } = await waitForLoadedSession();

    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
    expect(getSecureStore().deleteItemAsync).toHaveBeenCalled();
  });
});

describe("SessionProvider — signIn", () => {
  it("should sign in with valid credentials and persist the session", async () => {
    const account = makeAccount();
    const signup = await api.signup(account);
    const { result } = await waitForLoadedSession();

    await act(async () => {
      await result.current.signIn({
        login: account.username,
        password: account.password,
      });
    });

    expect(result.current.user).toEqual(signup.user);
    expect(result.current.session?.accessToken).toBeTruthy();
    expect(getSecureStore().setItemAsync).toHaveBeenCalled();
  });

  it("should reject invalid credentials without changing the state", async () => {
    const { result } = await waitForLoadedSession();

    await expect(
      act(async () => {
        await result.current.signIn({
          login: faker.internet.username(),
          password: faker.internet.password(),
        });
      }),
    ).rejects.toMatchObject({ status: 401 });

    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
  });
});

describe("SessionProvider — signUp", () => {
  it("should sign up and populate the user and session", async () => {
    const account = makeAccount();
    const { result } = await waitForLoadedSession();

    await act(async () => {
      await result.current.signUp(account);
    });

    expect(result.current.user).toMatchObject({
      name: account.name,
      username: account.username,
      email: account.email,
    });
    expect(result.current.session?.accessToken).toBeTruthy();
    expect(getSecureStore().setItemAsync).toHaveBeenCalled();
  });

  it("should reject duplicate data without changing the state", async () => {
    const account = makeAccount();
    await api.signup(account);
    const { result } = await waitForLoadedSession();

    await expect(
      act(async () => {
        await result.current.signUp(account);
      }),
    ).rejects.toMatchObject({ status: 409 });

    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
  });
});

describe("SessionProvider — signOut", () => {
  it("should sign out and clear the state and storage", async () => {
    const account = makeAccount();
    await api.signup(account);
    const { result } = await waitForLoadedSession();

    await act(async () => {
      await result.current.signIn({
        login: account.username,
        password: account.password,
      });
    });
    expect(result.current.user).not.toBeNull();

    await act(async () => {
      await result.current.signOut();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
    expect(getSecureStore().deleteItemAsync).toHaveBeenCalled();
  });
});

describe("SessionProvider — refreshSession", () => {
  it("should refresh the session with a valid token", async () => {
    const account = makeAccount();
    const signup = await api.signup(account);
    const { result } = await waitForLoadedSession();

    await act(async () => {
      await result.current.signIn({
        login: account.username,
        password: account.password,
      });
    });

    await act(async () => {
      await result.current.refreshSession();
    });

    expect(result.current.session?.accessToken).toBeTruthy();
    expect(result.current.user).toEqual(signup.user);
  });

  it("should do nothing when there is no session to refresh", async () => {
    const { result } = await waitForLoadedSession();

    await act(async () => {
      await result.current.refreshSession();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
  });
});
