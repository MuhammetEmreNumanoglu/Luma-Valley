import sys,glob,os
from PIL import Image,ImageDraw
d=sys.argv[1]; out=sys.argv[2]; cols=int(sys.argv[3]) if len(sys.argv)>3 else 10; S=int(sys.argv[4]) if len(sys.argv)>4 else 128
import re
def key(f):
    b=os.path.basename(f)[:-4]; mm=re.match(r'(.*?)(\d+)$',b)
    return (mm.group(1),int(mm.group(2))) if mm else (b,0)
fs=sorted(glob.glob(d+'/*.png'), key=key)
rows=(len(fs)+cols-1)//cols
o=Image.new('RGBA',(cols*S,rows*(S+14)),'#F4EAD5'); dr=ImageDraw.Draw(o)
for i,f in enumerate(fs):
    im=Image.open(f).convert('RGBA'); im.thumbnail((S,S))
    x=(i%cols)*S; y=(i//cols)*(S+14)
    o.paste(im,(x,y),im); dr.text((x+2,y+S),os.path.basename(f)[:-4][-18:],fill='#5a4632')
o.save(out)
