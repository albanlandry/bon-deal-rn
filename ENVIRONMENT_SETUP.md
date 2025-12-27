# Environment Variables Setup Guide

This guide explains how to configure and use environment variables for different environments (local, test, production) in the BonDeal Expo app.

## Overview

The app supports three environments:
- **local**: Development environment (default)
- **test**: Staging/test environment
- **production**: Production environment

## Quick Start

1. **Copy the example environment file:**
   ```bash
   cp .env.example .env.local
   ```

2. **Fill in your environment variables** in `.env.local`

3. **Start the app with the desired environment:**
   ```bash
   npm run start:local    # Local development
   npm run start:test     # Test/staging
   npm run start:prod     # Production
   ```

## Environment Files

### File Structure

- `.env.example` - Template file (committed to git)
- `.env.local` - Local development (not committed)
- `.env.test` - Test/staging environment (not committed)
- `.env.production` - Production environment (not committed)

### Required Variables

All environment files should contain:

```env
# App Environment
APP_ENV=local|test|production

# API Configuration
API_BASE_URL=http://localhost:3000/api/v1
API_TIMEOUT=30000

# Firebase Configuration
FIREBASE_API_KEY=your_key_here
FIREBASE_AUTH_DOMAIN=your_domain_here
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_bucket_here
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id

# Feature Flags
ENABLE_ANALYTICS=false
ENABLE_CRASHLYTICS=false
ENABLE_LOGGING=true

# Debug Settings
DEBUG_MODE=true
LOG_LEVEL=debug

# App Configuration
APP_NAME=BonDeal
APP_VERSION=1.0.0
```

## Usage in Code

### Import the Config

```typescript
import { config, getApiUrl, isLocal, isProduction } from '@/utils/config';
```

### Access Configuration Values

```typescript
// Get API base URL
const apiUrl = config.api.baseUrl;

// Get full API endpoint URL
const endpointUrl = getApiUrl('/auth/login');

// Check environment
if (isLocal()) {
  console.log('Running in local mode');
}

// Access feature flags
if (config.features.analytics) {
  // Initialize analytics
}

// Access Firebase config
const firebaseConfig = config.firebase;
```

### Example: API Call

```typescript
import { getApiUrl } from '@/utils/config';

const response = await fetch(getApiUrl('/auth/login'), {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ phone, password }),
});
```

## NPM Scripts

### Development Scripts

```bash
# Start Expo with local environment
npm run start:local

# Start Expo with test environment
npm run start:test

# Start Expo with production environment
npm run start:prod
```

### Build Scripts

```bash
# Android builds
npm run android:local
npm run android:test
npm run android:prod

# iOS builds
npm run ios:local
npm run ios:test
npm run ios:prod

# Web builds
npm run web:local
npm run web:test
npm run web:prod
```

### Prebuild Scripts

```bash
# Prebuild for different environments
npm run prebuild:local
npm run prebuild:test
npm run prebuild:prod
```

## Environment-Specific Configuration

### Local Development

- API URL: `http://localhost:3000/api/v1`
- Debug mode: Enabled
- Logging: Full debug logs
- Analytics: Disabled
- Crashlytics: Disabled

### Test/Staging

- API URL: `https://api-test.bondeal.com/api/v1`
- Debug mode: Enabled
- Logging: Info level
- Analytics: Enabled
- Crashlytics: Enabled

### Production

- API URL: `https://api.bondeal.com/api/v1`
- Debug mode: Disabled
- Logging: Error level only
- Analytics: Enabled
- Crashlytics: Enabled

## How It Works

1. **app.config.js** loads environment variables from `.env.{APP_ENV}` file using `dotenv`
2. Variables are injected into `Constants.expoConfig.extra` for runtime access
3. **utils/config.ts** provides a type-safe interface to access these variables
4. The config utility includes fallbacks and validation

## Security Best Practices

1. **Never commit `.env.local`, `.env.test`, or `.env.production` files**
2. **Use `.env.example` as a template** (this file is safe to commit)
3. **Store sensitive keys securely** - consider using:
   - EAS Secrets for production builds
   - Environment-specific Firebase projects
   - Secure key management services

## Troubleshooting

### Variables not loading?

1. Check that the `.env.{environment}` file exists
2. Verify `APP_ENV` is set correctly in your script
3. Ensure `dotenv` package is installed: `npm install dotenv`
4. Restart the Expo dev server after changing `.env` files

### Type errors?

The config utility is fully typed. If you see TypeScript errors:
1. Ensure `utils/config.ts` is properly imported
2. Check that `expo-constants` is installed
3. Restart your TypeScript server

### Build-time vs Runtime

- **Build-time**: Variables in `app.config.js` are available during build
- **Runtime**: Variables are accessible via `Constants.expoConfig.extra` and the config utility

## EAS Build Integration

For EAS builds, you can use EAS Secrets:

```bash
# Set secrets for production
eas secret:create --scope project --name API_BASE_URL --value https://api.bondeal.com/api/v1 --type string

# Or use environment-specific secrets
eas secret:create --scope project --name FIREBASE_API_KEY --value your_key --type string --environment production
```

Then reference them in `eas.json`:

```json
{
  "build": {
    "production": {
      "env": {
        "APP_ENV": "production",
        "API_BASE_URL": "@api_base_url"
      }
    }
  }
}
```

## Additional Resources

- [Expo Environment Variables](https://docs.expo.dev/guides/environment-variables/)
- [EAS Secrets](https://docs.expo.dev/build-reference/variables/)
- [dotenv Documentation](https://github.com/motdotla/dotenv)

