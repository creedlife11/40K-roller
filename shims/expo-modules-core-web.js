// Shim for expo-modules-core on web.
// Re-exports everything from the real package but guarantees registerWebModule
// is always a callable no-op so native module stubs don't crash the web bundle.
const real = require('expo-modules-core/build/index.js');

module.exports = {
  ...real,
  registerWebModule: real.registerWebModule ?? function registerWebModule() { return {}; },
};
