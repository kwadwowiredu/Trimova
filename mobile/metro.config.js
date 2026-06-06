const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// lucide-react-native distributes icons as .mjs ESM files — Metro needs this.
config.resolver.sourceExts = [
  ...config.resolver.sourceExts,
  'mjs',
];

module.exports = withNativeWind(config, { input: './global.css' });
