import { Stack } from "expo-router";

let AppEntryPoint = function RootLayout() {
  return <Stack />;
};

if (process.env.EXPO_PUBLIC_STORYBOOK_ENABLED === "true") {
  const StorybookUI = require("../../.storybook").default;
  AppEntryPoint = StorybookUI;
}

export default AppEntryPoint;

