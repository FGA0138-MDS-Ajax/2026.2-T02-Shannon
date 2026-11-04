import { Lucide } from "@react-native-vector-icons/lucide";
import { Tabs } from "expo-router/tabs";
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
        tabBarStyle: {
          backgroundColor: theme.colors.gray100,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Painel",
          tabBarIcon: ({ color }) => (
            <Lucide name="home" size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="habits"
        options={{
          title: "Hábitos",
          tabBarIcon: ({ color }) => (
            <Lucide name="rabbit" size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="check-in"
        options={{
          title: "Check-in",
          tabBarIcon: ({ color }) => (
            <Lucide name="book-open-check" size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="user"
        options={{
          title: "Usuário",
          tabBarIcon: ({ color }) => (
            <Lucide name="user" size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="new-habit" options={{ href: null }} />
      <Tabs.Screen name="habits/[id]/index" options={{ href: null }} />
      <Tabs.Screen name="habits/[id]/edit" options={{ href: null }} />
      <Tabs.Screen name="habits/[id]/goal" options={{ href: null }} />
      <Tabs.Screen name="check-ins/[id]/index" options={{ href: null }} />
      <Tabs.Screen name="check-ins/create" options={{ href: null }} />
      <Tabs.Screen name="check-ins/[id]/edit" options={{ href: null }} />
    </Tabs>
  );
}
