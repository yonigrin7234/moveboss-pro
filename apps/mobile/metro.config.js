const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Force critical packages to resolve from mobile's node_modules
config.resolver.extraNodeModules = {
  react: path.resolve(projectRoot, 'node_modules/react'),
  'react-native': path.resolve(projectRoot, 'node_modules/react-native'),
  'react-native-reanimated': path.resolve(projectRoot, 'node_modules/react-native-reanimated'),
  'react-native-worklets': path.resolve(projectRoot, 'node_modules/react-native-worklets'),
  'react-native-svg': path.resolve(projectRoot, 'node_modules/react-native-svg'),
};

// Watch folders for monorepo
config.watchFolders = [monorepoRoot];

// Block the root React from being used
config.resolver.blockList = [
  new RegExp(`^${monorepoRoot}/node_modules/react/.*$`),
];

module.exports = config;
