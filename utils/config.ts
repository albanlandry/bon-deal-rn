/**
 * Environment Configuration Utility
 * 
 * This module provides type-safe access to environment variables
 * across different environments (local, test, production).
 * 
 * Usage:
 *   import { config } from '@/utils/config';
 *   const apiUrl = config.api.baseUrl;
 */

import Constants from 'expo-constants';

// Define environment types
export type Environment = 'local' | 'test' | 'production';

// Define configuration interface
export interface AppConfig {
  env: Environment;
  api: {
    baseUrl: string;
    timeout: number;
  };
  firebase: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
  };
  features: {
    analytics: boolean;
    crashlytics: boolean;
    logging: boolean;
  };
  debug: {
    enabled: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
  };
  app: {
    name: string;
    version: string;
  };
}

// Get environment from Constants or default to 'local'
const getEnvironment = (): Environment => {
  const env = Constants.expoConfig?.extra?.env || process.env.APP_ENV || 'local';
  
  // Validate environment
  if (env === 'local' || env === 'test' || env === 'production') {
    return env;
  }
  
  // Fallback based on __DEV__ flag
  return __DEV__ ? 'local' : 'production';
};

// Get environment variable with fallback
const getEnvVar = (key: string, defaultValue: string = ''): string => {
  // Try to get from Constants.expoConfig.extra first (injected by app.config.js)
  const fromExtra = Constants.expoConfig?.extra?.[key];
  if (fromExtra) return fromExtra;
  
  // Fallback to process.env
  return process.env[key] || defaultValue;
};

// Get boolean environment variable
const getEnvBool = (key: string, defaultValue: boolean = false): boolean => {
  const value = getEnvVar(key);
  if (value === '') return defaultValue;
  return value.toLowerCase() === 'true';
};

// Get number environment variable
const getEnvNumber = (key: string, defaultValue: number = 0): number => {
  const value = getEnvVar(key);
  if (value === '') return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

// Build configuration object
const buildConfig = (): AppConfig => {
  const env = getEnvironment();
  
  return {
    env,
    api: {
      baseUrl: getEnvVar('API_BASE_URL', 'http://localhost:3000/api/v1'),
      timeout: getEnvNumber('API_TIMEOUT', 30000),
    },
    firebase: {
      apiKey: getEnvVar('FIREBASE_API_KEY'),
      authDomain: getEnvVar('FIREBASE_AUTH_DOMAIN'),
      projectId: getEnvVar('FIREBASE_PROJECT_ID'),
      storageBucket: getEnvVar('FIREBASE_STORAGE_BUCKET'),
      messagingSenderId: getEnvVar('FIREBASE_MESSAGING_SENDER_ID'),
      appId: getEnvVar('FIREBASE_APP_ID'),
    },
    features: {
      analytics: getEnvBool('ENABLE_ANALYTICS', env === 'production'),
      crashlytics: getEnvBool('ENABLE_CRASHLYTICS', env === 'production'),
      logging: getEnvBool('ENABLE_LOGGING', env !== 'production'),
    },
    debug: {
      enabled: getEnvBool('DEBUG_MODE', env === 'local'),
      logLevel: (getEnvVar('LOG_LEVEL', env === 'production' ? 'error' : 'debug') as 'debug' | 'info' | 'warn' | 'error'),
    },
    app: {
      name: getEnvVar('APP_NAME', 'BonDeal'),
      version: getEnvVar('APP_VERSION', '1.0.0'),
    },
  };
};

// Export configuration singleton
export const config: AppConfig = buildConfig();

// Export helper functions
export const isLocal = () => config.env === 'local';
export const isTest = () => config.env === 'test';
export const isProduction = () => config.env === 'production';
export const isDevelopment = () => config.env === 'local' || config.env === 'test';

// Export environment-specific helpers
export const getApiUrl = (endpoint: string = ''): string => {
  const baseUrl = config.api.baseUrl.replace(/\/$/, ''); // Remove trailing slash
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${path}`;
};

// Log configuration on startup (only in development)
if (__DEV__ && config.debug.enabled) {
  console.log('🔧 App Configuration:', {
    environment: config.env,
    apiBaseUrl: config.api.baseUrl,
    debugMode: config.debug.enabled,
    features: config.features,
  });
}

