const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require('nativewind/metro');
 
const config = getDefaultConfig(__dirname)
 
// Point to the actual globals file that imports Tailwind directives
module.exports = withNativeWind(config, { input: './globals.css' })