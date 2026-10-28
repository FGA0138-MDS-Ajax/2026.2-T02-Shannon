import { Tabs } from "expo-router/js-tabs";
import { theme } from "@/config/theme";

export default function AppLayout() {
  return (
    <Tabs
      // "Voltar" retorna à tela anterior (ex.: do detalhe para a lista)
      backBehavior="history"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: "#6B6560",
        tabBarLabelStyle: { fontFamily: theme.font.medium, fontSize: 13 },
        tabBarIconStyle: { display: "none" },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Hábitos" }} />
      <Tabs.Screen name="check-in" options={{ title: "Check-in" }} />
      <Tabs.Screen name="new-habit" options={{ href: null }} />
      <Tabs.Screen name="habits/[id]/index" options={{ href: null }} />
      <Tabs.Screen name="habits/[id]/edit" options={{ href: null }} />
      <Tabs.Screen name="check-ins/[id]/index" options={{ href: null }} />
      <Tabs.Screen name="check-ins/[id]/edit" options={{ href: null }} />
    </Tabs>
  );
}
