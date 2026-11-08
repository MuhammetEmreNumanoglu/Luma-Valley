// Node stand-in for '@shopify/react-native-skia' (used only by build scripts such as
// gen-sprites): loads CanvasKit and exposes the same JSI-style API that the app uses on web.
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const CanvasKitInit = require('canvaskit-wasm/bin/full/canvaskit.js');
globalThis.CanvasKit = await CanvasKitInit({});
const headless = require('@shopify/react-native-skia/lib/commonjs/headless');

export const Skia = headless.getSkiaExports().Skia;
export const { BlendMode, BlurStyle, PaintStyle, StrokeCap, StrokeJoin, TileMode, ClipOp, FillType, PathOp } = headless;
