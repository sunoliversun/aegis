const { getDefaultConfig } = require("expo/metro-config");
const { FileStore } = require("metro-cache");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Watch all files in the monorepo
config.watchFolders = [workspaceRoot];

// Resolve modules from workspace root first
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// Use workspace root for caching
config.cacheStores = [
  new FileStore({ root: path.join(projectRoot, ".metro-cache") }),
];

module.exports = config;
