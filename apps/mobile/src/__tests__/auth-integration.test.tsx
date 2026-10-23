import { act, renderHook, waitFor } from '@testing-library/react-native';
import { ReactNode } from 'react';
import { SessionProvider, useSession } from '@/contexts/auth-context';
import * as SecureStore from 'expo-secure-store';

let secureStoreMem: Record<string, string> = {};

beforeEach(() => {
  secureStoreMem = {};
  jest.clearAllMocks();
});

jest.spyOn(SecureStore, 'getItemAsync').mockImplementation(async (key) => secureStoreMem[key] || null);
jest.spyOn(SecureStore, 'setItemAsync').mockImplementation(async (key, value) => {
  secureStoreMem[key] = value;
});

jest.spyOn(SecureStore, 'deleteItemAsync').mockImplementation(async (key) => {
  delete secureStoreMem[key];
});


const mockFetch = jest.fn();
global.fetch = mockFetch;

const fakeUser = {
  id: '123',
  email: 'test@example.com',
  name: 'John Doe'
};

const fakeSingupResponse = {
  user: fakeUser,
  acessToken: 'fake-access',
  refreshToken: 'fake-refresh'
  expires_at: Date.now() + 10000
};

function wrapper({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}

describe('Auth Integration Tests', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('INT-01 - Cadastro Completo', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => fakeSingupResponse,
    });

  const { result } = renderHook(() => useSession() , { wrapper});
  
  await waitFor(() => {
    expect(result.current.isLoading).toBe(false);
  });

  await act(async (() => {
    await result.current.signUp('test@example.com', 'password123', 'John Doe');
  }));

  expect(mockFetch).toHaveBeenCalledWith(
    expect.stringContaining('/auth/signup'),
    expect.any(Object)
  );

  expect(result.current.user).toEqual(fakeUser);
  expect(result.current.session?.acessToken).toBe('fake-access');
  expect(secureStoreMem['auth_session']).toBeDefined();
  
  });

});