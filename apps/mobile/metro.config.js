const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withStorybook } = require('@storybook/react-native/withStorybook');

const config = getDefaultConfig(__dirname);

module.exports = withStorybook(config, {
  enabled: process.env.EXPO_PUBLIC_STORYBOOK_ENABLED === "true",
  configPath: path.resolve(__dirname, "./.storybook"),
});
