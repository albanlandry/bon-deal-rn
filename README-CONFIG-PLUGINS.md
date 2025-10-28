# Config Plugins Support

This project now supports Expo Config Plugins, allowing you to customize native projects during the prebuild phase.

## What's Changed

1. **`app.json` → `app.config.js`**: Converted to JavaScript for programmatic configuration
2. **Config Plugins**: Added support for custom plugins
3. **Prebuild Scripts**: Added `prebuild` and `prebuild:clean` commands

## Available Scripts

```bash
# Start Expo dev server
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios

# Run prebuild (generates native folders)
npm run prebuild

# Clean prebuild (removes and regenerates native folders)
npm run prebuild:clean
```

## Using Config Plugins

### Built-in Plugins

The following plugins are already configured:

- `expo-router`: File-based routing
- `expo-maps`: Maps functionality
- `expo-location`: Location services with permissions
- `expo-splash-screen`: Splash screen configuration

**Note**: Some packages like `expo-linear-gradient` don't need config plugins as they're pure JavaScript libraries.

### Custom Plugins

To create a custom plugin:

1. Create a file in the `plugins/` directory
2. Export a function that receives and returns the config
3. Add it to the plugins array in `app.config.js`

Example in `plugins/withCustomConfig.js`:

```javascript
const withCustomConfig = (config) => {
  // Modify the config here
  return config;
};

module.exports = withCustomConfig;
```

Then uncomment the plugin in `app.config.js`:

```javascript
plugins: [
  // ... other plugins
  './plugins/withCustomConfig.js',
],
```

## Configuration Options

Edit `app.config.js` to customize:

- App name, version, and metadata
- iOS and Android specific settings
- Splash screen configuration
- Plugins and experiments
- Custom environment variables

## Prebuild Workflow

When using managed workflow, Expo generates native code from your config:

```bash
npm run prebuild        # Generate native folders
npm run android         # Build and run Android
npm run ios             # Build and run iOS
```

## Development

1. Edit `app.config.js` for any configuration changes
2. Run `npm run prebuild:clean` if you make significant changes
3. The config is automatically validated on startup

## Resources

- [Expo Config Plugins Docs](https://docs.expo.dev/config-plugins/introduction/)
- [Creating Plugins](https://docs.expo.dev/config-plugins/creating-plugins/)
- [Common Plugins](https://docs.expo.dev/config-plugins/plugin-modules/)

