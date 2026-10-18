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
      "@react-native-firebase/messaging",
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
      // Cleartext (http://) is allowed ONLY outside production, so a developer can
      // still reach a local backend at http://10.0.2.2:8000. Production builds
      // forbid it: the API is served over TLS at https://bondeal.duckdns.org, and
      // a global cleartext permit would let any plaintext URL silently work.
      [
        'expo-build-properties',
        {
          android: {
            usesCleartextTraffic: (process.env.APP_ENV || 'local') !== 'production',
            // Pin build-tools to an installed, parser-readable version. Some SDK
            // installs carry canary packages (e.g. build-tools 37, android-36.1)
            // whose package.xml uses schema v4, which AGP's bundled parser can't
            // read — it then fails to verify the default build-tools 35.0.0 and
            // aborts trying to (re)download it. Pinning to 36.0.0 (matches
            // compileSdk 36) sidesteps the scan. Survives `prebuild --clean`.
            buildToolsVersion: '36.0.0',
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
      apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:8000/v1', // versioned API base
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

