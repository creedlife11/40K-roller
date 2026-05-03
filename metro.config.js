const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// On web, ensure expo-modules-core always exposes registerWebModule so that
// any remaining native module stubs don't crash with "is not a function".
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === 'expo-modules-core') {
    return {
      filePath: path.resolve(__dirname, 'shims/expo-modules-core-web.js'),
      type: 'sourceFile',
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
