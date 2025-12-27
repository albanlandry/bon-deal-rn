# Quick Start: Environment Variables

## Setup (One-time)

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create your environment files:**
   ```bash
   # Copy the example file
   cp .env.example .env.local
   cp .env.example .env.test
   cp .env.example .env.production
   ```

3. **Fill in your values** in each `.env.{environment}` file

## Daily Usage

### Start Development Server

```bash
# Local development (default)
npm run start:local

# Test/staging environment
npm run start:test

# Production environment
npm run start:prod
```

### Build for Different Environments

```bash
# Android
npm run android:local
npm run android:test
npm run android:prod

# iOS
npm run ios:local
npm run ios:test
npm run ios:prod
```

## Using Config in Your Code

```typescript
import { config, getApiUrl } from '@/utils/config';

// Get API URL
const apiUrl = config.api.baseUrl;

// Get full endpoint URL
const loginUrl = getApiUrl('/auth/login');

// Check environment
if (config.env === 'local') {
  console.log('Development mode');
}

// Use feature flags
if (config.features.analytics) {
  // Initialize analytics
}
```

## Important Notes

- ✅ `.env.example` is safe to commit (template only)
- ❌ Never commit `.env.local`, `.env.test`, or `.env.production`
- 🔄 Restart Expo dev server after changing `.env` files
- 🔐 Use EAS Secrets for production builds

See `ENVIRONMENT_SETUP.md` for detailed documentation.

