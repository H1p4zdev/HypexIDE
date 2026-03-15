// ─── Hypex IDE Design Tokens ──────────────────────────────────────────────────

export const Colors = {
  // Core
  primary: '#007AFF',
  primaryDark: '#0056CC',
  primaryLight: '#4DA3FF',
  accent: '#5856D6',
  success: '#34C759',
  warning: '#FF9500',
  danger: '#FF3B30',
  info: '#5AC8FA',

  // Backgrounds
  bgPrimary: '#FFFFFF',
  bgSecondary: '#F2F2F7',
  bgTertiary: '#E5E5EA',
  bgCard: '#FFFFFF',
  bgModal: 'rgba(255,255,255,0.92)',

  // Dark backgrounds
  bgDarkPrimary: '#0A0A0F',
  bgDarkSecondary: '#1C1C1E',
  bgDarkTertiary: '#2C2C2E',
  bgDarkCard: '#1C1C1E',
  bgDarkModal: 'rgba(28,28,30,0.95)',

  // Editor
  editorBg: '#1E1E2E',
  editorGutter: '#181825',
  editorLine: '#313244',
  editorSelection: '#45475A',

  // Text
  textPrimary: '#000000',
  textSecondary: '#6C6C70',
  textTertiary: '#AEAEB2',
  textDisabled: '#C7C7CC',
  textInverse: '#FFFFFF',

  // Dark text
  textDarkPrimary: '#FFFFFF',
  textDarkSecondary: '#AEAEB2',
  textDarkTertiary: '#6C6C70',

  // Syntax highlighting (Catppuccin Mocha)
  syntaxKeyword: '#CBA6F7',
  syntaxString: '#A6E3A1',
  syntaxNumber: '#FAB387',
  syntaxComment: '#6C7086',
  syntaxFunction: '#89B4FA',
  syntaxVariable: '#CDD6F4',
  syntaxOperator: '#89DCEB',
  syntaxType: '#F38BA8',
  syntaxAttribute: '#F9E2AF',

  // Borders
  borderLight: '#E5E5EA',
  borderMedium: '#C7C7CC',
  borderDark: '#3A3A3C',

  // Glass
  glassBg: 'rgba(255,255,255,0.72)',
  glassDarkBg: 'rgba(28,28,30,0.72)',
  glassBorder: 'rgba(255,255,255,0.18)',
  glassDarkBorder: 'rgba(255,255,255,0.08)',

  // Gradients
  gradientBlue: ['#007AFF', '#5856D6'],
  gradientGreen: ['#34C759', '#30D158'],
  gradientOrange: ['#FF9500', '#FF6B00'],
  gradientPurple: ['#5856D6', '#BF5AF2'],
  gradientDark: ['#1C1C1E', '#0A0A0F'],
} as const;

export const Typography = {
  // Font Families
  fontMono: 'SpaceMono' as const,
  fontSans: undefined as undefined, // system default

  // Sizes
  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 20,
  xl: 24,
  xxl: 28,
  xxxl: 34,
  display: 42,

  // Weights
  light: '300' as const,
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  heavy: '800' as const,

  // Line Heights
  lineHeightTight: 1.2,
  lineHeightNormal: 1.5,
  lineHeightRelaxed: 1.75,

  // Letter Spacing
  letterSpacingTight: -0.5,
  letterSpacingNormal: 0,
  letterSpacingWide: 0.5,
  letterSpacingWidest: 1.5,
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  huge: 64,
} as const;

export const Radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  full: 9999,
} as const;

export const Shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.18,
    shadowRadius: 40,
    elevation: 16,
  },
} as const;

export const Animation = {
  // Spring configs
  springGentle: { damping: 20, stiffness: 200, mass: 1 },
  springBouncy: { damping: 12, stiffness: 300, mass: 0.8 },
  springSnappy: { damping: 25, stiffness: 400, mass: 0.7 },
  springWobble: { damping: 8, stiffness: 180, mass: 1.2 },

  // Timing configs
  durationFast: 150,
  durationNormal: 250,
  durationSlow: 400,
  durationVerySlow: 600,

  // Easing names for ref
  easingStandard: 'cubic-bezier(0.4, 0, 0.2, 1)',
  easingDecelerate: 'cubic-bezier(0, 0, 0.2, 1)',
  easingAccelerate: 'cubic-bezier(0.4, 0, 1, 1)',
} as const;

export const Breakpoints = {
  phone: 0,
  tablet: 768,
  desktop: 1024,
} as const;

// Theme interface
export type ThemeMode = 'light' | 'dark';

export interface Theme {
  mode: ThemeMode;
  colors: typeof Colors;
  bg: {
    primary: string;
    secondary: string;
    tertiary: string;
    card: string;
    modal: string;
  };
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
    disabled: string;
    inverse: string;
  };
  border: string;
  glass: {
    bg: string;
    border: string;
  };
}

export const lightTheme: Theme = {
  mode: 'light',
  colors: Colors,
  bg: {
    primary: Colors.bgPrimary,
    secondary: Colors.bgSecondary,
    tertiary: Colors.bgTertiary,
    card: Colors.bgCard,
    modal: Colors.bgModal,
  },
  text: {
    primary: Colors.textPrimary,
    secondary: Colors.textSecondary,
    tertiary: Colors.textTertiary,
    disabled: Colors.textDisabled,
    inverse: Colors.textInverse,
  },
  border: Colors.borderLight,
  glass: {
    bg: Colors.glassBg,
    border: Colors.glassBorder,
  },
};

export const darkTheme: Theme = {
  mode: 'dark',
  colors: Colors,
  bg: {
    primary: Colors.bgDarkPrimary,
    secondary: Colors.bgDarkSecondary,
    tertiary: Colors.bgDarkTertiary,
    card: Colors.bgDarkCard,
    modal: Colors.bgDarkModal,
  },
  text: {
    primary: Colors.textDarkPrimary,
    secondary: Colors.textDarkSecondary,
    tertiary: Colors.textDarkTertiary,
    disabled: Colors.textDisabled,
    inverse: Colors.textPrimary,
  },
  border: Colors.borderDark,
  glass: {
    bg: Colors.glassDarkBg,
    border: Colors.glassDarkBorder,
  },
};
