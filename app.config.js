/**
 * @type {import('expo/config').ExpoConfig}
 */
module.exports = {
  expo: {
    name: 'bondeal',
    slug: 'bondeal',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    userInterfaceStyle: 'automatic',
    scheme: 'bondeal',
    newArchEnabled: true,
    splash: {
      image: './assets/images/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.gabtech.bondeal',
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/images/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: 'com.gabtech.bondeal',
      googleServicesFile: './firebase/configs/google-services.json',
    },
    web: {
      bundler: 'metro',
      output: 'static',
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      'expo-router',
      'expo-maps',
      "@react-native-firebase/app",
      "@react-native-firebase/auth",
      "@react-native-firebase/crashlytics",
      [
        'expo-location',
        {
          locationAlwaysAndWhenInUsePermission: 'Allow BonDeal to use your location to show nearby deals.',
          locationAlwaysPermission: 'Allow BonDeal to use your location in the background.',
          locationWhenInUsePermission: 'Allow BonDeal to use your location to show nearby deals.',
          isIosBackgroundLocationEnabled: false,
          isAndroidBackgroundLocationEnabled: false,
        },
      ],
      [
        'expo-splash-screen',
        {
          backgroundColor: '#ffffff',
          image: './assets/images/splash-icon.png',
          dark: {
            image: './assets/images/splash-icon.png',
            backgroundColor: '#000000',
          },
        },
      ],
      // Uncomment to use custom config plugin
      // './plugins/withCustomConfig.js',
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      // Add any custom configuration here
      eas: {
        projectId: 'your-project-id',
      },
    },
  },
};

