import { Lucide } from "@react-native-vector-icons/lucide";
import { Image } from "expo-image";
import { useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { theme } from "@/config/theme";
import type { CheckInPhotoPublic } from "@/services/types/habits";

/**
 * Chave de cache que não muda com a assinatura: o caminho do arquivo, sem a
 * query. A API troca o caminho quando a foto é trocada, então a chave também.
 */
export function photoCacheKey(signedUrl: string): string {
  return signedUrl.split("?")[0];
}

export interface CheckInPhotoProps {
  photo: CheckInPhotoPublic;
  /** `full` no detalhe; `thumb` nas listas, que só recebem a miniatura. */
  variant: "full" | "thumb";
  /**
   * Chamado quando a imagem não abre (a URL vale 30 min). Deve refazer o GET
   * de onde a foto veio. Só é chamado uma vez por foto.
   */
  onExpired?: () => void;
}

export default function CheckInPhoto(props: CheckInPhotoProps) {
  // Foto nova (outro caminho) remonta a imagem e volta a tentar do zero
  return <PhotoImage key={photoCacheKey(photoUri(props))} {...props} />;
}

function photoUri({ photo, variant }: CheckInPhotoProps): string {
  return variant === "full"
    ? (photo.url ?? photo.thumbnail_url)
    : photo.thumbnail_url;
}

function PhotoImage({ photo, variant, onExpired }: CheckInPhotoProps) {
  const uri = photoUri({ photo, variant });
  const [failed, setFailed] = useState(false);
  const [aspectRatio, setAspectRatio] = useState(4 / 3);
  const renewed = useRef(false);

  const handleError = () => {
    if (!renewed.current && onExpired) {
      renewed.current = true;
      onExpired();
      return;
    }
    setFailed(true);
  };

  if (failed) {
    return (
      <View
        testID="check-in-photo-unavailable"
        style={variant === "full" ? styles.fullFallback : styles.thumb}
      >
        <Lucide name="image-off" size={20} color={theme.colors.subtle} />
        {variant === "full" && (
          <Text style={styles.fallbackText}>
            Não foi possível carregar a foto.
          </Text>
        )}
      </View>
    );
  }

  return (
    <Image
      testID="check-in-photo"
      source={{ uri, cacheKey: photoCacheKey(uri) }}
      cachePolicy="memory-disk"
      contentFit="cover"
      accessibilityLabel="Foto do check-in"
      style={variant === "full" ? [styles.full, { aspectRatio }] : styles.thumb}
      onLoad={({ source }) => {
        // A API não manda largura e altura: a proporção vem da própria imagem
        if (variant === "full" && source.width && source.height) {
          setAspectRatio(source.width / source.height);
        }
      }}
      onError={handleError}
    />
  );
}

const styles = StyleSheet.create({
  full: {
    width: "100%",
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.gray200,
  },
  fullFallback: {
    width: "100%",
    aspectRatio: 4 / 3,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.gray200,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  fallbackText: {
    fontFamily: theme.font.regular,
    fontSize: 14,
    color: theme.colors.muted,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.gray200,
    alignItems: "center",
    justifyContent: "center",
  },
});
