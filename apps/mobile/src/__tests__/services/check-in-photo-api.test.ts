import { Platform } from "react-native";
import { API_URL } from "@/services/api";
import { getErrorMessage } from "@/services/api-errors";
import {
  removeCheckInPhoto,
  uploadCheckInPhoto,
} from "@/services/check-ins-api";

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(async () =>
    JSON.stringify({ accessToken: "acc", refreshToken: "ref", exp: 1 }),
  ),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// File do expo-file-system: guarda a uri para o teste conferir o que foi anexado
jest.mock("expo-file-system", () => ({
  File: class {
    uri: string;
    constructor(fileUri: string) {
      this.uri = fileUri;
    }
  },
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

function makeResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
  } as unknown as Response;
}

const photo = {
  thumbnail_url: "https://storage/check-ins/c1/a-thumb.jpg?X-Amz-Signature=1",
  url: "https://storage/check-ins/c1/a-full.jpg?X-Amz-Signature=1",
};

// O FormData dos testes é o do Node: o que importa é o que foi anexado
const appendSpy = jest.spyOn(FormData.prototype, "append");

beforeEach(() => {
  jest.clearAllMocks();
  mockFetch.mockResolvedValue(makeResponse(photo));
});

describe("uploadCheckInPhoto", () => {
  it("sends the file as an expo File in the photo field, without a JSON content type", async () => {
    await expect(uploadCheckInPhoto("c1", "file:///foto.jpg")).resolves.toEqual(
      photo,
    );

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${API_URL}/check-ins/c1/photo`);
    expect(init.method).toBe("PUT");
    expect(init.body).toBeInstanceOf(FormData);
    expect(init.headers["Content-Type"]).toBeUndefined();
    expect(init.headers.Authorization).toBe("Bearer acc");
    expect(appendSpy).toHaveBeenCalledWith("photo", {
      uri: "file:///foto.jpg",
    });
  });

  it("sends a Blob on the web", async () => {
    jest.replaceProperty(Platform, "OS", "web");
    const blob = new Blob(["jpeg"]);
    mockFetch.mockResolvedValueOnce({ blob: async () => blob });

    await uploadCheckInPhoto("c1", "blob:http://localhost/1");

    expect(mockFetch).toHaveBeenNthCalledWith(1, "blob:http://localhost/1");
    expect(appendSpy).toHaveBeenCalledWith("photo", blob, "photo.jpg");
    jest.restoreAllMocks();
  });

  it("explains a 413 from the host that comes without JSON", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 413,
      json: jest.fn().mockRejectedValue(new SyntaxError("not json")),
    });

    const error = await uploadCheckInPhoto("c1", "file:///foto.jpg").catch(
      (err: unknown) => err,
    );

    expect(getErrorMessage(error)).toBe("A foto deve ter no máximo 4 MB.");
  });
});

describe("removeCheckInPhoto", () => {
  it("accepts the 204 without a body", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(null, 204));

    await expect(removeCheckInPhoto("c1")).resolves.toBeUndefined();

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${API_URL}/check-ins/c1/photo`);
    expect(init.method).toBe("DELETE");
  });
});
