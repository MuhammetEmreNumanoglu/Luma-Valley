# Illustrated finish for studio renders: ink lines from normal/depth breaks, soft outer outline,
# warm saturation grade, then 2x downsample. usage: python3 postfx.py <dir> [names...]
import sys, os, glob
import numpy as np
from PIL import Image, ImageFilter
D = sys.argv[1]
names = sys.argv[2:] or sorted({os.path.basename(p)[:-4] for p in glob.glob(f'{D}/*.png') if not p.endswith(('.nrm.png', '.dep.png', '.fx.png'))})
def edges(name):
    c = np.asarray(Image.open(f'{D}/{name}.png').convert('RGBA')).astype(np.float32) / 255
    a = c[..., 3]
    n = np.asarray(Image.open(f'{D}/{name}.nrm.png').convert('RGB')).astype(np.float32) / 255 * 2 - 1
    dep = np.asarray(Image.open(f'{D}/{name}.dep.png').convert('L')).astype(np.float32) / 255
    def grad(x):
        gx = np.zeros_like(x); gy = np.zeros_like(x)
        gx[:, 1:] = x[:, 1:] - x[:, :-1]; gy[1:] = x[1:] - x[:-1]
        return gx, gy
    gx, gy = grad(n[..., 0]); hx, hy = grad(n[..., 1]); ix, iy = grad(n[..., 2])
    en = np.sqrt(gx**2 + gy**2 + hx**2 + hy**2 + ix**2 + iy**2)
    dx, dy = grad(dep); ed = np.sqrt(dx**2 + dy**2)
    e = np.clip((en - 0.35) / 0.5, 0, 1) * 0.75 + np.clip((ed - 0.004) / 0.01, 0, 1)
    e = np.clip(e, 0, 1) * (a > 0.5)
    # outer silhouette line
    A = Image.fromarray((a * 255).astype(np.uint8))
    grow = np.asarray(A.filter(ImageFilter.MaxFilter(5))).astype(np.float32) / 255
    sil = np.clip(grow - a, 0, 1)
    return c, a, e, sil
for name in names:
    if not os.path.exists(f'{D}/{name}.nrm.png'): continue
    c, a, e, sil = edges(name)
    rgb = c[..., :3]
    # warm saturation grade
    L = (rgb * [0.3, 0.59, 0.11]).sum(-1, keepdims=True)
    rgb = np.clip(L + (rgb - L) * 1.14, 0, 1)
    rgb = np.clip(rgb * [1.02, 1.0, 0.96], 0, 1)
    ink = rgb * [0.42, 0.33, 0.27]
    k = (e * 0.62)[..., None]
    rgb = rgb * (1 - k) + ink * k
    # silhouette: dark warm line outside the alpha edge (only where the object is, not its cast shadow)
    shadow_only = (a > 0) & (a < 0.6)
    sk = sil * 0.8
    out_rgb = rgb * (1 - sk[..., None]) + np.array([0.29, 0.20, 0.14]) * sk[..., None]
    out_a = np.maximum(a, sk)
    img = np.dstack([out_rgb, out_a])
    im = Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8), 'RGBA')
    im = im.resize((im.width // 2, im.height // 2), Image.LANCZOS)
    im.save(f'{D}/{name}.fx.png')
print('ok', len(names))
