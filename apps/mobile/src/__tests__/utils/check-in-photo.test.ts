import * as ImagePicker from "expo-image-picker";
import {
  canEditPhoto,
  localPhotoErrorMessage,
  PHOTO_MAX_BYTES,
  PhotoError,
  pickPhoto,
  preparePhoto,
} from "@/utils/check-in-photo";

jest.mock("expo-image-picker", () => ({
  requestCameraPermissionsAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));

const mockResize = jest.fn();
const mockSave = jest.fn();
jest.mock("expo-image-manipulator", () => ({
  SaveFormat: { JPEG: "jpeg" },
  ImageManipulator: {
    manipulate: () => ({
      resize: mockResize,
      renderAsync: async () => ({ saveAsync: mockSave }),
    }),
  },
}));

const picker = jest.mocked(ImagePicker);

// Tamanho de cada arquivo salvo, na ordem das tentativas. No celular o
// tamanho vem do expo-file-system (o fetch do Android não abre `file://`)
let mockSavedSizes: number[] = [];
jest.mock("expo-file-system", () => ({
  File: class {
    size = mockSavedSizes.shift() ?? 1000;
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockSavedSizes = [];
  mockSave.mockImplementation(async ({ compress }) => ({
    uri: `file:///jpeg-${compress}.jpg`,
  }));
});

describe("pickPhoto", () => {
  const granted = { granted: true } as ImagePicker.PermissionResponse;

  it("returns the chosen photo from the library", async () => {
    picker.requestMediaLibraryPermissionsAsync.mockResolvedValue(
      granted as ImagePicker.MediaLibraryPermissionResponse,
    );
    picker.launchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file:///a.heic", width: 4000, height: 3000 }],
    } as ImagePicker.ImagePickerResult);

    await expect(pickPhoto("library")).resolves.toEqual({
      uri: "file:///a.heic",
      width: 4000,
      height: 3000,
    });
    expect(picker.launchImageLibraryAsync).toHaveBeenCalledWith(
      expect.objectContaining({ mediaTypes: ["images"] }),
    );
  });

  it("returns null when the user cancels the camera", async () => {
    picker.requestCameraPermissionsAsync.mockResolvedValue(granted);
    picker.launchCameraAsync.mockResolvedValue({
      canceled: true,
      assets: null,
    });

    await expect(pickPhoto("camera")).resolves.toBeNull();
  });

  it("explains how to allow the camera when permission is denied", async () => {
    picker.requestCameraPermissionsAsync.mockResolvedValue({
      granted: false,
    } as ImagePicker.PermissionResponse);

    await expect(pickPhoto("camera")).rejects.toThrow(
      "Permita o acesso à câmera nas configurações do celular.",
    );
    expect(picker.launchCameraAsync).not.toHaveBeenCalled();
  });
});

describe("preparePhoto", () => {
  it("limits the long side of a landscape photo to 1600 px", async () => {
    const prepared = await preparePhoto({
      uri: "file:///a.heic",
      width: 4000,
      height: 3000,
    });

    expect(mockResize).toHaveBeenCalledWith({ width: 1600, height: null });
    expect(mockSave).toHaveBeenCalledWith({ format: "jpeg", compress: 0.8 });
    expect(prepared).toEqual({ uri: "file:///jpeg-0.8.jpg", size: 1000 });
  });

  it("limits the height of a portrait photo and never enlarges small ones", async () => {
    await preparePhoto({ uri: "file:///a.jpg", width: 3000, height: 4000 });
    expect(mockResize).toHaveBeenCalledWith({ width: null, height: 1600 });

    mockResize.mockClear();
    await preparePhoto({ uri: "file:///b.jpg", width: 800, height: 600 });
    expect(mockResize).not.toHaveBeenCalled();
  });

  it("still reduces a photo when the picker sends no size", async () => {
    await preparePhoto({ uri: "file:///a.jpg", width: 0, height: 0 });

    expect(mockResize).toHaveBeenCalledWith({ width: 1600, height: null });
  });

  it("compresses more until the file fits in 4 MB", async () => {
    mockSavedSizes = [PHOTO_MAX_BYTES + 1, PHOTO_MAX_BYTES];

    const prepared = await preparePhoto({
      uri: "file:///a.jpg",
      width: 4000,
      height: 3000,
    });

    expect(prepared.uri).toBe("file:///jpeg-0.65.jpg");
  });

  it("gives up when not even the smallest version fits", async () => {
    mockSavedSizes = Array(4).fill(PHOTO_MAX_BYTES + 1);

    await expect(
      preparePhoto({ uri: "file:///a.jpg", width: 4000, height: 3000 }),
    ).rejects.toThrow("A foto deve ter no máximo 4 MB.");
  });
});

describe("canEditPhoto", () => {
  // 23:30 de 26/11 em São Paulo (UTC-3)
  const checkIn = { user_id: "u1", created_at: "2026-11-27T02:30:00Z" };

  it.each([
    [
      "the author on the same day in São Paulo",
      "u1",
      "2026-11-27T02:59:00Z",
      true,
    ],
    ["another user", "u2", "2026-11-27T02:59:00Z", false],
    [
      "the author after midnight in São Paulo",
      "u1",
      "2026-11-27T03:10:00Z",
      false,
    ],
  ])("is %s → %s", (_case, userId, now, allowed) => {
    expect(canEditPhoto(checkIn, userId, new Date(now))).toBe(allowed);
  });
});

describe("localPhotoErrorMessage", () => {
  it("keeps our own messages and hides internal failures", () => {
    expect(localPhotoErrorMessage(new PhotoError("Permita o acesso."))).toBe(
      "Permita o acesso.",
    );
    expect(
      localPhotoErrorMessage(new TypeError("Network request failed")),
    ).toBe("Não foi possível usar esta foto. Escolha outra.");
  });
});
