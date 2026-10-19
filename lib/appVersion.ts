import Constants from 'expo-constants';

/**
 * The app's marketing version (app.config.js `version`), sent as
 * `X-App-Version` and compared with `/app-config` min/latest versions.
 */
export const APP_VERSION: string =
  Constants.expoConfig?.version ?? (Constants as any).manifest?.version ?? '0.0.0';
