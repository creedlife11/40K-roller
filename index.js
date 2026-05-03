import { registerRootComponent } from 'expo';
import App from './App';

// Use a minimal entry point instead of expo/AppEntry.js to avoid
// expo/build/Expo.fx auto-linking registration (which calls registerWebModule
// and crashes on web when native-only modules are installed).
registerRootComponent(App);
