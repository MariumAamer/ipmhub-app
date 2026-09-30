const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = (async () => {
  const {
    resolver: {sourceExts, assetExts},
  } = await getDefaultConfig(__dirname);

  return {
    transformer: {
      babelTransformerPath: require.resolve('react-native-svg-transformer'),
      // PERF: with ~90 screens/components all statically imported from
      // AppNavigator, every module (and its heavy deps) was evaluated at
      // launch. inlineRequires defers each require() until the module is
      // first used, so startup only pays for what the first screen needs.
      getTransformOptions: async () => ({
        transform: {
          experimentalImportSupport: false,
          inlineRequires: true,
        },
      }),
    },
    resolver: {
      assetExts: assetExts.filter(ext => ext !== 'svg'),
      sourceExts: [...sourceExts, 'svg'],
    },
  };
})();

module.exports = mergeConfig(getDefaultConfig(__dirname), config);