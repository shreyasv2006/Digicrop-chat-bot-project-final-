const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const metroResolver = require('metro-resolver');

const config = getDefaultConfig(__dirname);

// Capitalize drive letter for Windows compatibility
const projectRoot = __dirname.replace(/^[a-z]:/, match => match.toUpperCase());

config.watchFolders = [
  ...config.watchFolders,
  path.resolve(projectRoot, 'node_modules/react-native-safe-area-context'),
  path.resolve(projectRoot, 'node_modules/expo-status-bar'),
];

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const resolveDefault = (ctx, name, plt) => {
    const { resolveRequest, ...cleanCtx } = ctx;
    return metroResolver.resolve(cleanCtx, name, plt);
  };

  if (moduleName === 'node:async_hooks' || moduleName === 'async_hooks') {
    return {
      filePath: path.resolve(projectRoot, 'src/mocks/async_hooks.js'),
      type: 'sourceFile',
    };
  }

  if (moduleName === 'fbjs/lib/invariant') {
    return {
      filePath: path.resolve(projectRoot, 'node_modules/fbjs/lib/invariant.js'),
      type: 'sourceFile',
    };
  }
  
  if (moduleName === 'react-native-safe-area-context') {
    const subpath = platform === 'web' ? 'lib/module/index.js' : 'lib/commonjs/index.js';
    return {
      filePath: path.resolve(projectRoot, `node_modules/react-native-safe-area-context/${subpath}`),
      type: 'sourceFile',
    };
  }
  
  if (moduleName === 'expo-status-bar') {
    const ext = platform === 'web' ? '.web.js' : '.js';
    return {
      filePath: path.resolve(projectRoot, `node_modules/expo-status-bar/build/StatusBar${ext}`),
      type: 'sourceFile',
    };
  }

  return resolveDefault(context, moduleName, platform);
};

module.exports = config;
