import React, { ReactNode } from 'react';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import { SessionProvider, useSession } from '@/contexts/auth-context';

let secureStoreMem: Record<string, string> = {};

const mockFetch = jest.fn();
global.fetch = mockFetch;

const fakeUser = {
  id: '1',
  email: 'test@example.com',
  name: 'Test User',
  username: 'testuser',
};
const fakeTokenResponse = {
  access_token: 'fake-access',
  refresh_token: 'fake-refresh',
  exp: Math.floor(Date.now() / 1000) + 3600,
};
const fakeSignupResponse = {
  user: fakeUser,
  token: fakeTokenResponse,
};

function wrapper({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}

describe('Auth Integration Tests', () => {
  beforeEach(() => {
    secureStoreMem = {};
    mockFetch.mockReset();
    jest.clearAllMocks();

    jest.spyOn(SecureStore, 'getItemAsync').mockImplementation(async (key) => secureStoreMem[key] || null);
    jest.spyOn(SecureStore, 'setItemAsync').mockImplementation(async (key, value) => {
      secureStoreMem[key] = value;
    });
    jest.spyOn(SecureStore, 'deleteItemAsync').mockImplementation(async (key) => {
      delete secureStoreMem[key];
    });
  });

  it('INT-01 - Cadastro completo', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => fakeSignupResponse,
    });

    const { result } = await renderHook(() => useSession(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.signUp({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      });
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/signup'),
      expect.any(Object)
    );
    expect(result.current.user).toEqual(fakeUser);
    expect(result.current.session?.accessToken).toBe('fake-access');
    expect(secureStoreMem['habbit.auth.tokens']).toBeDefined();
  });

  it('INT-02 - Login com credenciais válidas', async () => {
    const fakeLoginResponse = {
      access_token: 'login-access',
      refresh_token: 'login-refresh',
      exp: Math.floor(Date.now() / 1000) + 3600,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => fakeLoginResponse,
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => fakeUser,
    });

    const { result } = await renderHook(() => useSession(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.signIn({
        login: 'test@example.com',
        password: 'password123',
      });
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/login'),
      expect.any(Object)
    );
    expect(result.current.user).toEqual(fakeUser);
    expect(result.current.session?.accessToken).toBe('login-access');
    expect(secureStoreMem['habbit.auth.tokens']).toBeDefined();
  });

  it('INT-03 - Credenciais inválidas / falha na API', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ detail: "Credenciais inválidas." }),
    });

    const { result } = await renderHook(() => useSession(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await expect(
        result.current.signIn({
          login: 'wrong@example.com',
          password: 'wrongpassword',
        })
      ).rejects.toThrow();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
    expect(secureStoreMem['habbit.auth.tokens']).toBeUndefined();
  });
});