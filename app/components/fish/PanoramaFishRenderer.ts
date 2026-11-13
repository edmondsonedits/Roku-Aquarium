import type {FishFinalePublicEntry} from '../../../lib/arcade/fish-finale';
import type {FishPose} from '../../../lib/fish-motion';
import {drawSprite} from '../AquariumCanvas';
import {FishMesh} from './FishMesh';

export type PanoramaFishDraw = {image: HTMLImageElement; entry: FishFinalePublicEntry; pose: FishPose};

/** Composites continuous drawing-textured fish into a 2.5D scenery stack.
 * One offscreen WebGL surface is reused across bands, not one context per fish.
 * The original drawing is mirrored on turns; this is 2.5D, not a sculpted species model.
 * Canvas fallback retains all fish when WebGL is unavailable or loses context. */
export class PanoramaFishRenderer {
 private canvas: HTMLCanvasElement;
 private mesh: FishMesh | null = null;
 private sources = new Map<string,HTMLImageElement>();
 private disposed = false;
 private failed = false;
 private lost = (event: Event) => {event.preventDefault();this.fallback();};
 constructor() {
  this.canvas=document.createElement('canvas');
  this.canvas.addEventListener('webglcontextlost',this.lost);
  try {this.mesh=new FishMesh(this.canvas);} catch {this.failed=true;}
 }
 get mode(): 'artwork' | 'canvas' {return this.mesh?'artwork':'canvas';}
 private fallback() {
  this.mesh?.dispose();this.mesh=null;this.sources.clear();this.failed=true;
 }
 /** Once per animation frame, retain only live artwork and upload changes once. */
 prepare(items: PanoramaFishDraw[],width:number,height:number) {
  if(this.disposed)return;
  const w=Math.max(1,Math.round(width)),h=Math.max(1,Math.round(height));
  if(this.canvas.width!==w)this.canvas.width=w;
  if(this.canvas.height!==h)this.canvas.height=h;
  if(!this.mesh||this.failed)return;
  try {
   const wanted=new Set(items.map(item=>item.entry.id));
   for(const id of this.sources.keys())if(!wanted.has(id)){this.mesh.remove(id);this.sources.delete(id);}
   for(const item of items)if(this.sources.get(item.entry.id)!==item.image){
    this.mesh.texture(item.entry.id,item.image,item.entry);this.sources.set(item.entry.id,item.image);
   }
  }catch {this.fallback();}
 }
 /** Items must be sorted far-to-near. Call once for each scenery depth band. */
 drawBand(ctx:CanvasRenderingContext2D,items:PanoramaFishDraw[],width:number,height:number) {
  if(this.disposed||!items.length)return;
  if(this.mesh){
   try {
    this.mesh.begin(width,height,items.length);
    for(const item of items)this.mesh.draw(item.entry,item.pose,width,height);
    // Same-task copy occurs before WebGL's non-preserved drawing buffer is cleared.
    ctx.drawImage(this.canvas,0,0,width,height);
    return;
   }catch {this.fallback();}
  }
  for(const item of items)drawSprite(ctx,item.image,item.entry,item.pose,width,height);
 }
 dispose() {
  if(this.disposed)return;
  this.disposed=true;this.canvas.removeEventListener('webglcontextlost',this.lost);
  this.mesh?.dispose();this.mesh=null;this.sources.clear();
  this.canvas.width=1;this.canvas.height=1;
 }
}
