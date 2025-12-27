/**
 * Example usage of the config utility
 * 
 * This file demonstrates how to use the environment configuration
 * in your application code.
 */

import { config, getApiUrl, isLocal, isProduction, isDevelopment } from './config';

// Example 1: Making an API call
export async function loginUser(phone: string, password: string) {
  const response = await fetch(getApiUrl('/auth/login'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ phone, password }),
  });
  
  return response.json();
}

// Example 2: Conditional feature initialization
export function initializeAnalytics() {
  if (config.features.analytics) {
    // Initialize analytics service
    console.log('Analytics enabled');
  }
}

// Example 3: Environment-specific logging
export function log(message: string, level: 'debug' | 'info' | 'warn' | 'error' = 'info') {
  if (!config.features.logging) return;
  
  const logLevels = ['debug', 'info', 'warn', 'error'];
  const currentLevel = logLevels.indexOf(config.debug.logLevel);
  const messageLevel = logLevels.indexOf(level);
  
  if (messageLevel >= currentLevel) {
    console[level](`[${config.env.toUpperCase()}] ${message}`);
  }
}

// Example 4: Firebase configuration
export function getFirebaseConfig() {
  return {
    apiKey: config.firebase.apiKey,
    authDomain: config.firebase.authDomain,
    projectId: config.firebase.projectId,
    storageBucket: config.firebase.storageBucket,
    messagingSenderId: config.firebase.messagingSenderId,
    appId: config.firebase.appId,
  };
}

// Example 5: Environment checks
export function shouldShowDebugInfo() {
  return isDevelopment() && config.debug.enabled;
}

// Example 6: API timeout configuration
export function createApiClient() {
  return {
    baseUrl: config.api.baseUrl,
    timeout: config.api.timeout,
    // ... other client configuration
  };
}

