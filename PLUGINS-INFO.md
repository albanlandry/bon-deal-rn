# Config Plugins Information

## Packages That DON'T Need Config Plugins

These packages are pure JavaScript and work without config plugins:

- ✅ `expo-linear-gradient` - Pure JS library
- ✅ `@react-navigation/native` - Pure JS library  
- ✅ `react-native-reanimated` - Works without plugin (uses `"newArchEnabled": true` in config)
- ✅ Most `expo-*` packages with only JS functionality

## Packages That DO Need Config Plugins

These packages require config plugins because they modify native code:

- ✅ `expo-router` - Needs native modifications
- ✅ `expo-maps` - Needs native maps integration
- ✅ `expo-location` - Needs location permissions in native code
- ✅ `expo-splash-screen` - Configures native splash screen

## How to Add a New Package That Needs Native Code

1. Install the package:
```bash
npm install expo-package-name
```

2. If the package has a config plugin, add it to `app.config.js`:
```javascript
plugins: [
  // ... existing plugins
  'expo-package-name', // or with options:
  ['expo-package-name', { /* options */ }],
],
```

3. If the package doesn't have a config plugin but needs native code, you may need to:
   - Check the package documentation
   - Create a custom plugin in `plugins/`
   - Or add native configurations manually in a bare workflow

## Current Configuration

See `app.config.js` for the current plugins configured for BonDeal.

