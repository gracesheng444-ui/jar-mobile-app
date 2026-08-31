const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

// jar-core-logic is a sibling package linked via "file:../jar-core-logic" — Metro
// needs to watch it directly and follow the symlink to resolve it.
config.watchFolders = [path.resolve(projectRoot, '..', 'jar-core-logic')];
config.resolver.unstable_enableSymlinks = true;

module.exports = config;
