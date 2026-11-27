import { File } from "expo-file-system";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { Platform } from "react-native";
import type { CheckIn } from "@/services/types/habits";

// Limite da API: acima disso ela responde 413
export const PHOTO_MAX_BYTES = 4 * 1024 * 1024;

// A API reduz a foto cheia para 1280 px; mandar mais que isso só gasta dados
const LONG_SIDE = 1600;
const COMPRESS_STEPS = [0.8, 0.65, 0.5];

export type PhotoSource = "library" | "camera";

export interface PickedPhoto {
  uri: string;
  width: number;
  height: number;
}

export interface PreparedPhoto {
  uri: string;
  size: number;
}

export class PhotoError extends Error {}

/** Frase para falhas ao escolher ou preparar a foto, ainda no celular. */
export function localPhotoErrorMessage(err: unknown): string {
  return err instanceof PhotoError
    ? err.message
    : "Não foi possível usar esta foto. Escolha outra.";
}

/** Abre a galeria ou a câmera. `null` quando a pessoa cancela. */
export async function pickPhoto(
  source: PhotoSource,
): Promise<PickedPhoto | null> {
  const permission =
    source === "camera"
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new PhotoError(
      source === "camera"
        ? "Permita o acesso à câmera nas configurações do celular."
        : "Permita o acesso às fotos nas configurações do celular.",
    );
  }

  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ["images"],
    quality: 1,
  };
  const result =
    source === "camera"
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);

  const asset = result.assets?.[0];
  if (result.canceled || !asset) return null;
  return { uri: asset.uri, width: asset.width, height: asset.height };
}

// No Android o fetch não abre `file://`: no celular o tamanho vem do arquivo
async function fileSize(uri: string): Promise<number> {
  if (Platform.OS === "web") return (await (await fetch(uri)).blob()).size;
  return new File(uri).size;
}

async function toJpeg(photo: PickedPhoto, longSide: number, compress: number) {
  const context = ImageManipulator.manipulate(photo.uri);
  // Só reduz: foto menor que o limite fica do tamanho que está
  if (Math.max(photo.width, photo.height) > longSide) {
    context.resize(
      photo.width >= photo.height
        ? { width: longSide, height: null }
        : { width: null, height: longSide },
    );
  }
  const image = await context.renderAsync();
  const { uri } = await image.saveAsync({ format: SaveFormat.JPEG, compress });
  return { uri, size: await fileSize(uri) };
}

/**
 * Regrava como JPEG (HEIC e WebP não passam na API), limita o lado maior e
 * comprime até caber em 4 MB.
 */
export async function preparePhoto(photo: PickedPhoto): Promise<PreparedPhoto> {
  for (const compress of COMPRESS_STEPS) {
    const prepared = await toJpeg(photo, LONG_SIDE, compress);
    if (prepared.size <= PHOTO_MAX_BYTES) return prepared;
  }

  const last = await toJpeg(photo, 1280, 0.5);
  if (last.size > PHOTO_MAX_BYTES) {
    throw new PhotoError("A foto deve ter no máximo 4 MB.");
  }
  return last;
}

// O Brasil não tem horário de verão desde 2019: São Paulo é sempre UTC-3
const SAO_PAULO_OFFSET_MS = 3 * 60 * 60 * 1000;

function saoPauloDate(date: Date): string {
  return new Date(date.getTime() - SAO_PAULO_OFFSET_MS)
    .toISOString()
    .slice(0, 10);
}

/**
 * A API só deixa o autor mexer na foto, e só no dia do check-in em São Paulo
 * (no fuso do servidor, não no do celular). O 403/409 dela é a palavra final.
 */
export function canEditPhoto(
  checkIn: Pick<CheckIn, "user_id" | "created_at">,
  userId: string | undefined,
  now: Date = new Date(),
): boolean {
  return (
    checkIn.user_id === userId &&
    saoPauloDate(new Date(checkIn.created_at)) === saoPauloDate(now)
  );
}
