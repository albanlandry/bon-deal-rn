/**
 * Custom Expo config plugin for BonDeal
 * 
 * This is an example plugin that you can customize for your specific needs.
 * Config plugins allow you to modify native projects during the prebuild phase.
 * 
 * @param {import('@expo/config-types').ExpoConfig} config - The Expo config
 * @returns {import('@expo/config-types').ExpoConfig} Modified config
 */
const { withPlugins } = require('@expo/config-plugins');

const withCustomConfig = (config) => {
  // Example: Add custom configuration modifications here
  // You can modify AndroidManifest, Info.plist, AppDelegate, etc.
  
  // Add any custom plugins or modifications
  // return withPlugins(config, [
  //   // Add your plugins here
  // ]);
  
  return config;
};

module.exports = withCustomConfig;

