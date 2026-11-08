// Soft meadow greens, warm ivory and restrained honey accents across the interface.
export const colors = {
  cream: '#F1F4E8',
  creamDeep: '#E1E9D5',
  paper: '#FBFCF3',
  surface: '#F9FBF2',
  surfaceAlt: '#EAF1E2',
  border: '#CDDCC5',
  borderDeep: '#A9BFA7',
  sage: '#71947B',
  sageDeep: '#416957',
  grass: '#B6D39B',
  honey: '#EFC26A',
  honeyDeep: '#B77D29',
  orange: '#F2865A',
  wood: '#B07A4A',
  woodDeep: '#7A5232',
  sky: '#A8D8EE',
  ink: '#293F35',
  inkSoft: '#52695B',
  white: '#FFFFFF',
  night: '#1E2440',
  nightSoft: '#2E3658',
  danger: '#D9604A',
  token: '#E9A23B',
  energy: '#3FB8B0',
  lilac: '#B9A3E3',
  shadow: 'rgba(39,68,51,0.18)',
};

export const font = {
  regular: 'Nunito_500Medium',
  medium: 'Nunito_600SemiBold',
  bold: 'Nunito_700Bold',
  black: 'Nunito_800ExtraBold',
};

export const radius = { s: 10, m: 16, l: 22, xl: 28 };

/** Minimum touch target (Apple HIG 44pt, Material 48dp). */
export const HIT = 44;

/** Absolute full-cover style (RN 0.88 no longer exports StyleSheet.absoluteFillObject). */
export const FILL = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const;
