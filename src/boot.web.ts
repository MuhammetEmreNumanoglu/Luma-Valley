// Web preview only (used for fast iteration on Windows). CanvasKit must load before any Skia
// module is evaluated, so the app is imported lazily after it.
import { registerRootComponent } from 'expo';
import { LoadSkiaWeb } from '@shopify/react-native-skia/lib/module/web';

// Mobile Safari: a drag must steer the spark, never scroll, bounce, zoom or select text.
for (const el of [document.documentElement, document.body]) {
  el.style.touchAction = 'none';
  el.style.overscrollBehavior = 'none';
  el.style.userSelect = 'none';
  el.style.setProperty('-webkit-user-select', 'none');
  el.style.setProperty('-webkit-touch-callout', 'none');
}

LoadSkiaWeb({ locateFile: (file: string) => `/${file}` }).then(async () => {
  const { default: App } = await import('./App');
  registerRootComponent(App);
});
