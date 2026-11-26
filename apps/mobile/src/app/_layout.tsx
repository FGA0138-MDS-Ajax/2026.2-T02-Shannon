import { SplashScreen, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import SWR from "@/config/swr";
import { SessionProvider, useSession } from "@/contexts/auth-context";
import useFonts from "@/hooks/useFonts";

SplashScreen.preventAutoHideAsync().catch(() => {});

export const unstable_settings = {
  anchor: "index",
};

function RootNavigation() {
  const areFontsLoaded = useFonts();
  const { isLoading: isSessionLoading, session } = useSession();

  useEffect(() => {
    if (areFontsLoaded && !isSessionLoading) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [areFontsLoaded, isSessionLoading]);

  if (!areFontsLoaded || isSessionLoading) {
    return null;
  }

  return (
    <>
      {/* Base do app: ícones escuros. As telas de cabeçalho escuro
          (HeroLayout) põem a clara por cima enquanto estão na frente. */}
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />

        <Stack.Protected guard={!!session}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>

        <Stack.Protected guard={!session}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
      </Stack>
    </>
  );
}

function RootLayout() {
  return (
    <SWR>
      <SessionProvider>
        <RootNavigation />
      </SessionProvider>
    </SWR>
  );
}

let AppEntryPoint = RootLayout;

if (process.env.EXPO_PUBLIC_STORYBOOK_ENABLED === "true") {
  const StorybookUI = require("../../.storybook").default;
  SplashScreen.hideAsync().catch(() => {});
  AppEntryPoint = StorybookUI;
}

export default AppEntryPoint;
