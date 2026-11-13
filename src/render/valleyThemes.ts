// Theme-specific, deterministic vector scenery. The same drawing is used by the
// playable valley and its store preview; no full-screen texture is retained.
import { Skia, type SkCanvas } from '@shopify/react-native-skia';
import { hash01 } from '../core/rng';
import { blob, curve, fill, line, lin, rad, shade, shadow, sparkle } from './kit';

export type ValleyTheme = 'sakura' | 'winter' | 'moonlight' | 'autumn';
export const VALLEY_THEMES: Record<ValleyTheme, { path: [string, string, string]; stone: [string, string]; shrub: [string, string]; accent: string; light: string }> = {
  sakura: { path: ['#8F7969','#C8AE98','#E8D4BF'], stone: ['#C9BDB0','#778E78'], shrub: ['#81B36F','#427B51'], accent: '#E784A7', light: '#FFE4B8' },
  winter: { path: ['#5D879C','#A7CEDC','#F0FAFA'], stone: ['#D8ECF0','#6C94A5'], shrub: ['#82B4AD','#356F70'], accent: '#EAFBFF', light: '#D0EEFF' },
  moonlight: { path: ['#383C69','#7278A2','#B4BCE0'], stone: ['#95A8C8','#485779'], shrub: ['#7886BC','#35486D'], accent: '#83D6DA', light: '#A8C8F4' },
  autumn: { path: ['#805237','#BF8150','#E4B274'], stone: ['#C4A688','#846547'], shrub: ['#B69A4E','#69763C'], accent: '#ED9D3D', light: '#FFD28B' },
};
export function valleyTheme(id?: string): ValleyTheme | undefined {
  return id && Object.prototype.hasOwnProperty.call(VALLEY_THEMES, id) ? id as ValleyTheme : undefined;
}

/** A layered evergreen or broadleaf crown, with shape and silhouette specific to the season. */
export function themedTree(c: SkCanvas, id: Exclude<ValleyTheme, 'sakura'>, x: number, y: number, s: number, seed: number) {
  shadow(c,x,y,21*s,5*s,0.25);
  const trunk = id === 'moonlight' ? ['#8B91AA','#4A526E'] : ['#A17A5D','#5C473B'];
  c.drawPath(blob([[x-4*s,y],[x-3*s,y-28*s],[x-10*s,y-43*s],[x-7*s,y-45*s],[x,y-32*s],[x+9*s,y-47*s],[x+12*s,y-44*s],[x+4*s,y-26*s],[x+5*s,y]],.23),lin(x-5*s,y-45*s,x+5*s,y,trunk));
  c.drawPath(curve([[x-1*s,y-2*s],[x,y-22*s],[x-5*s,y-34*s]]),line('#E8D3B2',s,0.35));
  if (id === 'winter') {
    // Three overlapping irregular boughs and separate snow caps create a pine silhouette.
    const tiers: [number,number,number][] = [[-25,22,26],[-40,18,26],[-55,13,25]];
    tiers.forEach(([dy,w,h],i)=>{
      const top=y+(dy-h*.7)*s, bottom=y+(dy+h*.3)*s;
      c.drawPath(blob([[x-w*s,bottom],[x-(w*.65)*s,bottom-7*s],[x-(w*.84)*s,bottom-6*s],[x,top],[x+w*.84*s,bottom-6*s],[x+w*.65*s,bottom-7*s],[x+w*s,bottom],[x,bottom+3*s]],.14),lin(x,top,x,bottom,['#8DC1BA','#397D77','#214F54']));
      c.drawPath(curve([[x-w*.78*s,bottom-3*s],[x-w*.43*s,bottom-6*s],[x,bottom-7*s],[x+w*.4*s,bottom-6*s],[x+w*.78*s,bottom-3*s]]),line(i===2?'#F5FCFA':'#D8F0ED',3.2*s,0.9));
      c.drawPath(curve([[x-3*s,top+9*s],[x,top+5*s],[x+4*s,top+12*s]]),line('#F3FCFA',2*s,0.8));
    });
    return;
  }
  const palette = id === 'autumn' ? ['#F4C35E','#E89738','#C65E2D','#9E4230'] : ['#B6BAE7','#888FD0','#596DB0','#394A86'];
  const crowns: [number,number,number][] = [[-17,-38,16],[15,-40,17],[-6,-54,18],[12,-57,16],[-23,-48,11],[25,-49,11],[0,-42,16]];
  crowns.forEach(([dx,dy,r],i)=>{
    const cx=x+dx*s,cy=y+dy*s,rr=r*s,col=palette[(i+Math.floor(hash01(seed,9)*2))%palette.length];
    c.drawPath(blob([[cx-rr,cy+rr*.2],[cx-rr*.8,cy-rr*.5],[cx-rr*.25,cy-rr*.9],[cx+rr*.35,cy-rr*.8],[cx+rr*.85,cy-rr*.4],[cx+rr,cy+rr*.2],[cx+rr*.45,cy+rr*.6],[cx-rr*.4,cy+rr*.65]],.45),rad(cx-rr*.3,cy-rr*.35,rr*1.7,[shade(col,.22),col,shade(col,-.24)],[0,.54,1]));
  });
  for(let i=0;i<23;i++){
    const dx=(hash01(seed+i,31)-.5)*55*s,dy=(-34-hash01(seed+i,32)*31)*s;
    c.drawOval(Skia.XYWHRect(x+dx,y+dy,3.4*s,1.8*s),fill(id==='autumn'?(i%4===0?'#B83F2F':'#FFE0A0'):'#C9E9F6',.58));
  }
  if(id==='moonlight') sparkle(c,x+15*s,y-57*s,3*s,'#DFE9FF',.65);
}

/** Themed, low-cost small vegetation and rocks; retains map interaction geometry. */
export function themedProp(c: SkCanvas, id: ValleyTheme, x:number,y:number,s:number,kind:'bush'|'rock'|'flower',seed:number) {
  const p=VALLEY_THEMES[id];
  if(kind==='rock') {
    c.drawPath(blob([[x-10*s,y],[x-7*s,y-8*s],[x+2*s,y-11*s],[x+10*s,y-4*s],[x+8*s,y+1*s]],.18),lin(x,y-11*s,x,y+2*s,p.stone));
    c.drawPath(curve([[x-6*s,y-7*s],[x,y-9*s],[x+4*s,y-7*s]]),line(id==='winter'?'#FFFFFF':p.accent,1.5*s,.65));
    if(id==='moonlight') sparkle(c,x+5*s,y-10*s,2.5*s,p.accent,.7);
    return;
  }
  if(kind==='bush') {
    shadow(c,x,y,12*s,3*s,.1);
    for(const [dx,dy,r] of [[-7,-5,6],[5,-7,8],[-1,-10,8]] as [number,number,number][]) c.drawCircle(x+dx*s,y+dy*s,r*s,rad(x+(dx-2)*s,y+(dy-3)*s,r*1.8*s,[p.shrub[0],p.shrub[1]]));
    if(id==='winter') c.drawPath(curve([[x-12*s,y-9*s],[x-6*s,y-12*s],[x,y-13*s],[x+7*s,y-11*s],[x+12*s,y-8*s]]),line('#EDF9F8',2.8*s,.9));
  }
  for(let i=0;i<(kind==='flower'?4:3);i++) {
    const dx=(i-1.5)*5*s,dy=(i%2)*3*s;
    if(id==='moonlight') {c.drawLine(x+dx,y,x+dx,y-6*s-dy,line('#94A4CB',s,.8));c.drawCircle(x+dx,y-7*s-dy,1.8*s,fill('#D8E5FF',.85));}
    else c.drawOval(Skia.XYWHRect(x+dx-2*s,y-5*s-dy,4*s,2.5*s),fill(i%2?p.accent:shade(p.accent,.22),.85));
  }
  void seed;
}

/** Seeded debris and tiny surface features, baked once per region and quality. */
export function themedGround(c:SkCanvas,id:ValleyTheme,seed:number,w:number,h:number,quality:'high'|'low') {
  const p=VALLEY_THEMES[id], count=quality==='high'?105:45;
  // Small, localized material shadows; baked into the existing region image.
  const patches=quality==='high'?26:12;
  for(let i=0;i<patches;i++) {
    const x=hash01(seed+i,171)*w,y=hash01(seed+i,172)*h,r=5+hash01(seed+i,173)*9;
    const col=id==='winter'?'#719CB0':id==='moonlight'?'#263A66':id==='autumn'?'#835A37':'#4F8750';
    c.drawOval(Skia.XYWHRect(x-r,y-r*.25,r*2,r*.5),fill(col,id==='winter'?.15:.18));
    if(id==='winter') c.drawOval(Skia.XYWHRect(x-r*.55,y-r*.3,r*1.1,r*.16),fill('#F3FBFC',.68));
  }
  for(let i=0;i<count;i++) {
    const x=hash01(seed+i,161)*w,y=hash01(seed+i,162)*h,size=1.2+hash01(seed+i,163)*2.3;
    if(id==='winter' && i%7===0) { sparkle(c,x,y,size*1.2,'#F4FFFF',.55); continue; }
    if(id==='moonlight' && i%6===0) { sparkle(c,x,y,size,'#D2DEFF',.6); continue; }
    c.drawOval(Skia.XYWHRect(x,y,size*(id==='autumn'?2.1:1.5),size*.7),fill(i%3===0?shade(p.accent,.2):p.accent,id==='moonlight'?.28:.48));
    if(i%13===0) c.drawOval(Skia.XYWHRect(x+4,y-2,size*1.2,size*.6),fill(p.accent,.5));
  }
}
