"""Currency icons that must not look alike:
- icon_token (Light Token) is re-graded from gold to a pale lilac-blue, so it no longer looks
  like the gold coin (Altın, item_coin_*).
- icon_spark (Kıvılcım currency) is the spark sprite on a 128 px icon canvas.
Usage: python3 scripts/art-tools/derive-icons.py (idempotent: reads the git-tracked originals)."""
import colorsys, json, re, subprocess, io
from PIL import Image

def original(path):
    data = subprocess.run(['git', 'show', f'HEAD:{path}'], capture_output=True).stdout
    return Image.open(io.BytesIO(data)).convert('RGBA') if data else Image.open(path).convert('RGBA')

tok = original('assets/art/icons/icon_token.png')
px = tok.load()
for y in range(tok.height):
    for x in range(tok.width):
        r, g, b, a = px[x, y]
        if a == 0: continue
        h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
        nr, ng, nb = colorsys.hls_to_rgb(0.70, min(1, l * 1.04 + 0.03), s * 0.62)
        px[x, y] = (round(nr * 255), round(ng * 255), round(nb * 255), a)
tok.save('assets/art/icons/icon_token.png', optimize=True)

spark = Image.open('assets/art/items/item_lantern_1.png').convert('RGBA')
bbox = spark.getbbox()
spark = spark.crop(bbox)
canvas = Image.new('RGBA', (128, 128), (0, 0, 0, 0))
f = min(112 / spark.width, 112 / spark.height)
spark = spark.resize((round(spark.width * f), round(spark.height * f)), Image.LANCZOS)
canvas.paste(spark, ((128 - spark.width) // 2, (128 - spark.height) // 2), spark)
canvas.save('assets/art/icons/icon_spark.png', optimize=True)

reg_path = 'src/art/registry.generated.ts'
reg = open(reg_path).read()
if "'icon_spark'" not in reg:
    line = re.search(r"  'icon_star': \{[^\n]*\n", reg).group(0)
    reg = reg.replace(line, line + "  'icon_spark': { src: require('../../assets/art/icons/icon_spark.png'), w: 128, h: 128, ax: 64, ay: 120, unit: 120 },\n")
    open(reg_path, 'w').write(reg)
man = json.load(open('assets/art/manifest.json'))
src = next(e for e in man if e['id'] == 'item_lantern_1')
man = [e for e in man if e['id'] != 'icon_spark']
man.append({'id': 'icon_spark', 'category': 'icons', 'file': 'assets/art/icons/icon_spark.png', 'size': [128, 128], 'anchor': [64, 120], 'pxPerUnit': 120,
            'source': src['source'] + ' — item_lantern_1 re-framed as an icon by scripts/art-tools/derive-icons.py', 'license': src['license']})
for e in man:
    if e['id'] == 'icon_token' and 'derive-icons' not in e['source']:
        e['source'] += ' — re-graded to lilac by scripts/art-tools/derive-icons.py'
json.dump(man, open('assets/art/manifest.json', 'w'), indent=2, ensure_ascii=False)
print('icons written')
