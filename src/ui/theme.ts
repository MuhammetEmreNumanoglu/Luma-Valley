// One palette for every screen: warm ivory surfaces, woodland greens and honey rewards.
// Teal identifies energy, lilac identifies star tokens, and terracotta signals an error.
// Text uses the deep shades; light shades are reserved for surfaces and highlights.
export const colors = {
  cream: '#F3F0E5',
  creamDeep: '#E6E9DA',
  paper: '#FFFCF3',
  surface: '#FFFCF5',
  surfaceAlt: '#E9EEDC',
  border: '#D4DDC7',
  borderDeep: '#AABD9F',
  sage: '#76956D',
  sageDeep: '#35634B',
  sageEdge: '#234735',
  sageRim: '#A6C1A0',
  sageSoft: '#DCEBD6',
  grass: '#B8CE9C',
  honey: '#EDBF63',
  honeyDeep: '#80571E',
  honeyEdge: '#B58636',
  honeyRim: '#FFE4A7',
  honeySoft: '#FFF0C9',
  honeySurface: '#FFF7E2',
  honeyInk: '#55401D',
  orange: '#D68B60',
  wood: '#AF855A',
  woodDeep: '#785536',
  sky: '#A8D3D6',
  ink: '#2C4135',
  inkSoft: '#596A58',
  white: '#FFFFFF',
  night: '#233D3D',
  nightSoft: '#304F4E',
  nightRaised: '#416461',
  nightEdge: '#192E30',
  nightRim: '#789C91',
  nightText: '#FFF8E8',
  nightMuted: '#CEDFD3',
  danger: '#B84F3D',
  dangerDeep: '#873C2E',
  dangerSoft: '#FBE5DC',
  dangerRim: '#E5A28C',
  token: '#8763AA',
  tokenDeep: '#63477F',
  tokenSoft: '#EFE7F6',
  tokenRim: '#CFBBDF',
  energy: '#58B7AF',
  energyDeep: '#235E5A',
  energySoft: '#DAF0EB',
  energyEdge: '#78B3AA',
  energyRim: '#ECFAF5',
  lilac: '#B29AC9',
  disabled: '#E4E8DC',
  disabledInk: '#5D6955',
  shadow: 'rgba(35,61,45,0.18)',
  shadowInk: '#233D2D',
  scrim: 'rgba(25,46,38,0.52)',
  scrimSoft: 'rgba(25,46,38,0.36)',
  scrimDeep: 'rgba(25,46,38,0.68)',
  glass: 'rgba(255,252,245,0.96)',
  glassSoft: 'rgba(255,252,245,0.90)',
  glassDark: 'rgba(35,61,50,0.94)',
  gloss: 'rgba(255,255,255,0.14)',
  highlight: 'rgba(255,255,255,0.35)',
  shadowText: 'rgba(25,46,38,0.30)',
  track: 'rgba(53,99,75,0.16)',
  trackLight: 'rgba(255,252,245,0.18)',
  silhouette: 'rgba(44,65,53,0.30)',
  dropValid: 'rgba(118,149,109,0.48)',
  dropInvalid: 'rgba(184,79,61,0.32)',
  dropNeutral: 'rgba(237,191,99,0.38)',
};

/** Canvas and native controls share the same colors, including off-screen map previews. */
export const boardColors = {
  frame: colors.sage,
  frameDeep: colors.sageDeep,
  rim: '#D9E4C7',
  bed: '#A3BA95',
  bedDeep: '#819D78',
  tile: '#FAF5E6',
  tileAlt: '#ECF0DE',
  tileEdge: '#CFD9BC',
  tileEdgeAlt: '#C0CFAF',
  locked: '#ADBAA1',
  lockedAlt: '#A0AF96',
  lockedPreview: '#BDC8AE',
  lockedPreviewAlt: '#C8D0BB',
};

export const puzzleColors = {
  light: [colors.honey, '#79D1CD'],
  core: [colors.honeySurface, colors.energyRim],
  tile: ['#8CAD9F', '#587B70'],
  fixedTile: ['#708D83', '#4F6C63'],
  groove: '#243F3E',
  grooveInner: '#35534E',
  stone: ['#A6ADA0', '#65746B'],
} as const;

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

/** UI-only palettes. World rendering continues to use the original `colors` object. */
export type UiTheme = 'light' | 'dark';
export const darkUiColors: typeof colors = {
  ...colors,
  cream: '#202C2B', creamDeep: '#263532', paper: '#2D3B39', surface: '#344440', surfaceAlt: '#384A46',
  border: '#52665E', borderDeep: '#6D8376', sage: '#79B99A', sageDeep: '#416C58', sageEdge: '#294A3B', sageRim: '#87B39A', sageSoft: '#354E43',
  honeySoft: '#51452F', honeySurface: '#453D2F', honeyInk: '#F7E8C5', honeyDeep: '#E8BE69', honeyRim: '#D4B16D',
  ink: '#F3EEDF', inkSoft: '#C1CEC5', token: '#B99AE8', tokenDeep: '#D4BDF3', tokenSoft: '#413952', tokenRim: '#806B97',
  energyDeep: '#ACE1D5', energySoft: '#294A47', energyRim: '#7EBDB2', dangerSoft: '#503632', dangerDeep: '#F3B7A7',
  disabled: '#40504A', disabledInk: '#B2C0B4', shadow: 'rgba(0,0,0,0.28)', shadowInk: '#101B18',
  glass: 'rgba(45,59,57,0.97)', glassSoft: 'rgba(45,59,57,0.94)', glassDark: 'rgba(25,40,36,0.96)',
  track: 'rgba(197,218,199,0.22)', silhouette: 'rgba(193,206,197,0.35)',
};
let activeUiTheme: UiTheme = 'light';
export function setUiTheme(theme: UiTheme) { activeUiTheme = theme; }
export function uiPalette() { return activeUiTheme === 'dark' ? darkUiColors : colors; }
/** Lazily caches both style sheets; switching UI themes never alters Skia world colours. */
export function themedStyles<T extends object>(make: (palette: typeof colors) => T): T {
  let light: T | undefined, dark: T | undefined;
  return new Proxy({} as T, { get(_target, prop) {
    const sheet = activeUiTheme === 'dark' ? (dark ??= make(darkUiColors)) : (light ??= make(colors));
    return Reflect.get(sheet, prop);
  } });
}
