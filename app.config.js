/**
 * @type {import('expo/config').ExpoConfig}
 */

// Load environment variables
require('dotenv').config({
  path: process.env.ENV_FILE || `.env.${process.env.APP_ENV || 'local'}`,
});

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
      // Environment variables accessible via Constants.expoConfig.extra
      env: process.env.APP_ENV || 'local',
      apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:8000',
      apiTimeout: parseInt(process.env.API_TIMEOUT || '30000', 10),
      firebaseApiKey: process.env.FIREBASE_API_KEY || '',
      firebaseAuthDomain: process.env.FIREBASE_AUTH_DOMAIN || '',
      firebaseProjectId: process.env.FIREBASE_PROJECT_ID || '',
      firebaseStorageBucket: process.env.FIREBASE_STORAGE_BUCKET || '',
      firebaseMessagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
      firebaseAppId: process.env.FIREBASE_APP_ID || '',
      enableAnalytics: process.env.ENABLE_ANALYTICS === 'true',
      enableCrashlytics: process.env.ENABLE_CRASHLYTICS === 'true',
      enableLogging: process.env.ENABLE_LOGGING !== 'false',
      debugMode: process.env.DEBUG_MODE === 'true',
      logLevel: process.env.LOG_LEVEL || 'debug',
      appName: process.env.APP_NAME || 'BonDeal',
      appVersion: process.env.APP_VERSION || '1.0.0',
      // EAS configuration
      eas: {
        projectId: 'your-project-id',
      },
    },
  },
};

