import { render, screen, waitFor } from "@testing-library/react-native";
import StatisticsPanel from "@/components/statistics-panel";
import { SessionProvider } from "@/contexts/auth-context";
import SWR from "@/config/swr";
import { ApiError, api, toStoredTokens } from "@/services/api";
import { saveTokens, clearTokens } from "@/services/token-storage";
import { fetch as nodeFetch} from "undici";


global.fetch = nodeFetch as typeof fetch;

jest.mock("expo-router", () => ({
    router: {push: jest.fn() },
    useFocusEffect: jest.fn(),
}));

jest.mock("expo-secure-store", ()=> {
  const store: Record<string,string> = {};

  return {
    getItemAsync: jest.fn(async (key:string) => store[key] ?? null),
    setItemAsync: jest.fn(async (key:string, value:string) => {
      store[key] = value;
    }),
    deleteItemAsync: jest.fn(async(key:string) => {
      delete store[key];
    }),
  };
});

async function renderStatisticsPanel() {
  return render(
    <SessionProvider>
      <SWR>
      <StatisticsPanel />
      </SWR>
    </SessionProvider>
  );
}





let refreshToken: string | undefined;

beforeAll(async () => {
  const login = process.env.TEST_API_LOGIN;
  const password = process.env.TEST_API_PASSWORD;

  if (!login || !password) {
    throw new Error("Defina TEST_API_LOGIN e TEST_API_PASSWORD para o teste.");
  }

  const tokens = await api.login({ login, password });
  refreshToken = tokens.refresh_token;
  await saveTokens(toStoredTokens(tokens));

  try {
  const tokens = await api.login({ login, password });
  refreshToken = tokens.refresh_token;
  await saveTokens(toStoredTokens(tokens));
} catch (error) {
  if (error instanceof ApiError) {
    console.error("[login API]", error.status, error.data);
  }
  throw error;
}
});

afterAll(async () => {
  try {
    if (refreshToken) {
      await api.logout({ refresh_token: refreshToken });
    }
  } finally {
    await clearTokens();
  }
});

it("exibe as estatísticas recebidas da API", async () => {
  await renderStatisticsPanel();

  await waitFor(() => {
    expect(screen.getByTestId("statistics-content")).toBeTruthy();
  });
});

