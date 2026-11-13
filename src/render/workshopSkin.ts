/** Decorative board materials shared by the live workshop and its store preview.
 * Geometry stays inside the existing board bounds; no input or game state is touched. */
import { Skia, type SkCanvas } from '@shopify/react-native-skia';
import type { WorkshopSkinId } from '../premium/catalog';
import { WORKSHOP_SKINS } from '../premium/catalog';
import { boardColors, colors } from '../ui/theme';
import { blossom, curve, fill, leaf, lin, line, poly, shade } from './kit';

type Skin = (typeof WORKSHOP_SKINS)[number];
function skinFor(id: WorkshopSkinId): Skin { return WORKSHOP_SKINS.find(s => s.id === id) ?? WORKSHOP_SKINS[0]; }
function rect(c: SkCanvas, x: number, y: number, w: number, h: number, r: number, p: ReturnType<typeof fill>) { c.drawRRect(Skia.RRectXY(Skia.XYWHRect(x, y, w, h), r, r), p); }
function cut(x: number, y: number, w: number, h: number, k: number) { return poly([[x+k,y],[x+w-k,y],[x+w,y+k],[x+w,y+h-k],[x+w-k,y+h],[x+k,y+h],[x,y+h-k],[x,y+k]]); }

export function drawWorkshopFrame(c: SkCanvas, id: WorkshopSkinId, w: number, h: number) {
  const s = skinFor(id), classic = id === 'classic';
  const frame = classic ? boardColors.frame : s.frame;
  const radius = id === 'crystal' ? 7 : id === 'forest' ? 22 : id === 'sakura' ? 25 : 18;
  if (id === 'crystal') c.drawPath(cut(0, 0, w, h, 13), lin(0, 0, w, h, ['#265876', '#9FE5EF', '#386C94', '#B7F7F4']));
  else rect(c, 0, 0, w, h, radius, lin(0, 0, w, h, [shade(frame, 0.25), frame, shade(frame, -0.3)]));
  rect(c, 3, 3, w-6, h-6, Math.max(4, radius-4), line(classic ? boardColors.rim : shade(s.frame, 0.55), 1.3, 0.7));
  rect(c, 5, 5, w-10, h-10, Math.max(4, radius-6), lin(0, 5, w, h, [classic ? boardColors.bed : shade(s.bed, 0.18), classic ? boardColors.bedDeep : s.bed, classic ? boardColors.bedDeep : shade(s.bed, -0.18)]));
  // The fine edging is part of the frame, never over the active cell centres.
  if (id === 'forest' || id === 'sakura') {
    const branch = id === 'forest' ? '#41623C' : '#936078';
    for (const side of [0, 1]) {
      const x = side ? w-5 : 5;
      const pts: [number, number][] = [];
      for (let y=12; y<h-8; y+=18) pts.push([x + Math.sin(y * 0.04 + side) * 2, y]);
      if (pts.length > 1) c.drawPath(curve(pts), line(branch, 1.7, 0.9));
      for (let y=21; y<h-15; y+=32) {
        if (id === 'forest') leaf(c, x, y, 7, 2.3, side ? 3.4 : -0.3, '#8FBC77', false);
        else blossom(c, x, y, 3.4, 5, '#FFE4EE', '#C989A0', 0.4);
      }
    }
  } else if (id === 'crystal') {
    for (let y=22; y<h-15; y+=42) for (const x of [5, w-5]) {
      c.drawPath(poly([[x,y-6],[x+3,y],[x,y+6],[x-3,y]]), fill('#DDFEFF', 0.8));
      c.drawLine(x, y-5, x, y+5, line('#72BDD9', 0.8, 0.8));
    }
  } else if (id === 'moonlight') {
    for (let y=18; y<h-10; y+=27) for (const x of [5,w-5]) {
      c.drawCircle(x, y, 1.4, fill('#F5E4B3', 0.9));
      if (y % 2 === 0) { c.drawLine(x-2.5,y,x+2.5,y,line('#E5D6FF',0.7,0.8)); c.drawLine(x,y-2.5,x,y+2.5,line('#E5D6FF',0.7,0.8)); }
    }
  }
}

export function drawWorkshopTile(c: SkCanvas, id: WorkshopSkinId, x: number, y: number, size: number, even: boolean, locked: boolean) {
  const s = skinFor(id), classic = id === 'classic';
  const color = locked ? (classic ? (even ? boardColors.locked : boardColors.lockedAlt) : s.locked) : classic ? (even ? boardColors.tile : boardColors.tileAlt) : even ? s.tile : s.tileAlt;
  const edge = classic ? (even ? boardColors.tileEdge : boardColors.tileEdgeAlt) : s.edge;
  const x0=x+1.5, y0=y+1.5, w=size-3, h=size-3;
  const radius = id === 'forest' ? 12 : id === 'sakura' ? 13 : id === 'moonlight' ? 7 : 9;
  if (id === 'crystal') {
    c.drawPath(cut(x0,y0+1,w,h,Math.max(3,size*.13)), fill(shade(edge,-0.15)));
    c.drawPath(cut(x0,y0,w,h-2,Math.max(3,size*.13)), lin(x0,y0,x0+w,y0+h,[shade(color,0.22),color,shade(color,-0.1)]));
    c.drawPath(poly([[x0+4,y0+h*.32],[x0+w*.42,y0+4],[x0+w-5,y0+4]],false),line('#FFFFFF',0.9,locked ? 0.16 : 0.5));
    c.drawPath(poly([[x0+w*.66,y0+h-4],[x0+w-4,y0+h*.68],[x0+w-4,y0+h*.47]],false),line('#76BFD8',0.9,0.36));
  } else {
    rect(c,x0,y0+1,w,h,radius,fill(edge));
    rect(c,x0,y0,w,h-2,radius,lin(x0,y0,x0+w,y0+h,[shade(color,0.15),color,shade(color,-0.08)]));
    rect(c,x0+1,y0+1,w-2,h-4,Math.max(3,radius-2),line(classic ? colors.white : shade(edge,0.55),0.85,locked ? 0.16 : 0.5));
    if (id === 'forest') {
      c.drawPath(curve([[x0+3,y0+h*.72],[x0+6,y0+h*.82],[x0+12,y0+h*.84]]),line('#8BAC81',0.8,0.4));
      c.drawPath(curve([[x0+3,y0+h-4],[x0+8,y0+h-7],[x0+12,y0+h-7]]),line('#6D9670',1.15,0.7));
      if (size>20) { leaf(c,x0+4,y0+h-5,Math.min(8,size*.19),2,-0.75,'#8AB27E',false); leaf(c,x0+8,y0+h-6,Math.min(6,size*.14),1.7,0.18,'#ACCD9C',false); }
      if (even) c.drawPath(curve([[x0+w-10,y0+5],[x0+w-6,y0+7],[x0+w-4,y0+11]]),line('#87A981',0.8,0.55));
    } else if (id === 'sakura') {
      c.drawPath(curve([[x0+5,y0+5],[x0+w*.42,y0+3],[x0+w-7,y0+5]]),line('#FFFFFF',0.8,0.55));
      c.drawPath(curve([[x0+w-14,y0+h-5],[x0+w-9,y0+h-8],[x0+w-5,y0+h-12]]),line('#C791AA',0.85,0.55));
      if (size>20 && even) blossom(c,x0+w-7,y0+h-8,3,5,'#EDC0D1','#D291AA',0.4);
      c.drawOval(Skia.XYWHRect(x0+w-9,y0+h-8,4,2.5),fill('#D895B1',0.42));
      c.drawOval(Skia.XYWHRect(x0+5,y0+h-7,3,2),fill('#E6AEC4',0.35));
    } else if (id === 'moonlight') {
      c.drawPath(curve([[x0+4,y0+5],[x0+w*.5,y0+3],[x0+w-5,y0+5]]),line('#E4DFFF',1,0.65));
      c.drawCircle(x0+w-7,y0+h-7,1.3,fill('#A69AD2',0.75));
      c.drawPath(curve([[x0+w-15,y0+h-5],[x0+w-10,y0+h-6],[x0+w-6,y0+h-11]]),line('#BDB3DF',0.8,0.55));
      c.drawCircle(x0+w-13,y0+8,1.05,fill('#CBBCEB',0.65));
      if (even) { c.drawLine(x0+6,y0+h-9,x0+6,y0+h-5,line('#C9BDE9',0.7,0.5)); c.drawLine(x0+4,y0+h-7,x0+8,y0+h-7,line('#C9BDE9',0.7,0.5)); }
    }
  }
}

/** The preview uses the very same frame and tile painters as the live board. */
export function drawWorkshopPreview(c: SkCanvas, id: WorkshopSkinId) {
  const cell = 22, pad = 7, cols = 4, rows = 4;
  drawWorkshopFrame(c,id,cols*cell+pad*2,rows*cell+pad*2);
  for (let y=0; y<rows; y++) for (let x=0; x<cols; x++) drawWorkshopTile(c,id,pad+x*cell,pad+y*cell,cell,(x+y)%2===0,false);
}
