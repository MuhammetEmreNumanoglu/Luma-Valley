// Node resolve hook for build scripts and tests:
// - lets Node run the TypeScript sources directly (Node strips the types) while the sources keep
//   extensionless imports, as Metro and tsc expect;
// - maps '@shopify/react-native-skia' to a CanvasKit-backed shim (scripts/skia-shim.mjs).
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SHIM = new URL('./skia-shim.mjs', import.meta.url).href;

export async function resolve(specifier, context, next) {
  if (specifier === '@shopify/react-native-skia') return next(SHIM, context);
  if ((specifier.startsWith('.') || specifier.startsWith('/')) && !/\.[cm]?[jt]sx?$/.test(specifier) && context.parentURL) {
    for (const ext of ['.ts', '.tsx', '/index.ts']) {
      const url = new URL(specifier + ext, context.parentURL);
      if (existsSync(fileURLToPath(url))) return next(url.href, context);
    }
  }
  return next(specifier, context);
}
