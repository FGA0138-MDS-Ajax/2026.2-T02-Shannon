import { SplashScreen, Stack } from "expo-router";
import { useEffect } from "react";
import { SessionProvider, useSession } from "@/contexts/auth-context";
import useFonts from "@/hooks/useFonts";

SplashScreen.preventAutoHideAsync().catch(() => {});

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
    <Stack
      screenOptions={{ headerShown: false }}
      initialRouteName={session ? "(app)" : "index"}
    >
      <Stack.Screen name="index" />

      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>

      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

function RootLayout() {
  return (
    <SessionProvider>
      <RootNavigation />
    </SessionProvider>
  );
}

let AppEntryPoint = RootLayout;

if (process.env.EXPO_PUBLIC_STORYBOOK_ENABLED === "true") {
  const StorybookUI = require("../../.storybook").default;
  SplashScreen.hideAsync().catch(() => {});
  AppEntryPoint = StorybookUI;
}

export default AppEntryPoint;
