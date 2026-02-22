export const COLORS = {
  bg: '#0d0d0d',
  surface: '#1a1a1a',
  surfaceLight: '#242424',
  surfaceBorder: '#2e2e2e',
  primary: '#c41e3a',
  primaryDark: '#8b0000',
  primaryLight: '#e63254',
  secondary: '#d4af37',
  secondaryDark: '#a07d20',
  accent: '#4a90e2',
  text: '#f0f0f0',
  textSecondary: '#888',
  textMuted: '#555',
  border: '#2e2e2e',
  success: '#4caf50',
  warning: '#ff9800',
  info: '#2196f3',
  white: '#ffffff',
  black: '#000000',
};

export const FONTS = {
  heading: {
    fontWeight: '700' as const,
    letterSpacing: 1.5,
  },
  subheading: {
    fontWeight: '600' as const,
    letterSpacing: 0.8,
  },
  body: {
    fontWeight: '400' as const,
  },
  mono: {
    fontFamily: 'monospace' as const,
  },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const RADIUS = {
  sm: 6,
  md: 10,
  lg: 16,
  full: 999,
};

export const DIE_COLORS: Record<string, string> = {
  red: '#c41e3a',
  gold: '#d4af37',
  blue: '#4a90e2',
  green: '#4caf50',
  purple: '#9c27b0',
  orange: '#ff9800',
  teal: '#009688',
  white: '#e0e0e0',
};
