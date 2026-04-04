export const COLORS = {
  primary: '#6C63FF',
  primaryDark: '#5A52D5',
  primaryLight: '#8B83FF',
  secondary: '#FF6B6B',
  accent: '#4ECDC4',
  success: '#2ED573',
  warning: '#FFA502',
  danger: '#FF4757',

  background: '#0F0F1A',
  surface: '#1A1A2E',
  surfaceLight: '#252542',
  card: '#16213E',

  text: '#FFFFFF',
  textSecondary: '#A0A0B8',
  textMuted: '#6B6B80',
  textDark: '#1A1A2E',

  border: '#2A2A45',
  overlay: 'rgba(0, 0, 0, 0.5)',

  heartRate: '#FF6B6B',
  breathing: '#4ECDC4',
  stress: '#FFA502',
  readiness: '#6C63FF',
};

export const FONTS = {
  h1: { fontSize: 32, fontWeight: '800', color: COLORS.text },
  h2: { fontSize: 24, fontWeight: '700', color: COLORS.text },
  h3: { fontSize: 20, fontWeight: '600', color: COLORS.text },
  body: { fontSize: 16, fontWeight: '400', color: COLORS.text },
  bodySmall: { fontSize: 14, fontWeight: '400', color: COLORS.textSecondary },
  caption: { fontSize: 12, fontWeight: '400', color: COLORS.textMuted },
  button: { fontSize: 16, fontWeight: '600', color: COLORS.text },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BORDER_RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};
