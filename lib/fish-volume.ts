export type FishVolumePixels={width:number;height:number;data:Uint8ClampedArray};
export type FishVolumeAnchors={head:{x:number;y:number};body:{x:number;y:number};tail:{x:number;y:number}};
const NX=64,NY=48,FACE=(NX+1)*(NY+1);
/** Closed silhouette-cell mesh. Vertices are [x,y,z,u,v].
 * Faces preserve the original drawing; joined walls sample opaque cell interiors.
 * Thin fins retain volume during yaw. Intentional holes get interior walls.
 * This is a bounded 64x48 approximation, not a sculpted species model. */
export function buildFishVolume(pixels:FishVolumePixels,anchors:FishVolumeAnchors):{vertices:Float32Array;indices:Uint16Array}{
 const width=Number.isFinite(pixels.width)?Math.max(1,Math.floor(pixels.width)):1;
 const height=Number.isFinite(pixels.height)?Math.max(1,Math.floor(pixels.height)):1;
 const cells=new Uint8Array(NX*NY);
 for(let y=0;y<NY;y++)for(let x=0;x<NX;x++){
  const px=Math.min(width-1,Math.floor((x+.5)/NX*width)),py=Math.min(height-1,Math.floor((y+.5)/NY*height));
  cells[y*NX+x]=(pixels.data[(py*width+px)*4+3]??0)>=128?1:0;
 }
 if(!cells.some(Boolean)){
  // Do not silently lose a faint or sub-cell drawing: caller keeps its original
  // raster via Canvas fallback when a faithful volume cannot be constructed.
  if(pixels.data.some((alpha,index)=>index%4===3&&alpha>5))throw new Error('Artwork too fine for volume; use original drawing fallback');
  return {vertices:new Float32Array(),indices:new Uint16Array()};
 }
 const vertices:number[]=[],indices:number[]=[];
 const bodyX=Number.isFinite(anchors.body.x)?anchors.body.x:.5,bodyY=Number.isFinite(anchors.body.y)?anchors.body.y:.5;
 const thickness=(u:number,v:number)=>.012+.088*Math.max(0,1-((u-bodyX)/.23)**2-((v-bodyY)/.22)**2);
 for(let face=0;face<2;face++)for(let y=0;y<=NY;y++)for(let x=0;x<=NX;x++){
  const u=x/NX,v=y/NY;vertices.push(u,v,thickness(u,v)*(face===0?1:-1),u,v);
 }
 const occupied=(x:number,y:number)=>x>=0&&x<NX&&y>=0&&y<NY&&cells[y*NX+x]===1;
 const wall=(a:number,b:number,u:number,v:number)=>{
  const start=vertices.length/5;
  for(const index of [a,b,b+FACE,a+FACE])vertices.push(vertices[index*5]!,vertices[index*5+1]!,vertices[index*5+2]!,u,v);
  indices.push(start,start+1,start+2,start,start+2,start+3);
 };
 for(let y=0;y<NY;y++)for(let x=0;x<NX;x++)if(occupied(x,y)){
  const a=y*(NX+1)+x,b=a+1,d=a+NX+1,c=d+1,u=(x+.5)/NX,v=(y+.5)/NY;
  indices.push(a,b,c,a,c,d,a+FACE,c+FACE,b+FACE,a+FACE,d+FACE,c+FACE);
  if(!occupied(x,y-1))wall(a,b,u,v);
  if(!occupied(x+1,y))wall(b,c,u,v);
  if(!occupied(x,y+1))wall(c,d,u,v);
  if(!occupied(x-1,y))wall(d,a,u,v);
 }
 // Even a worst-case checkerboard remains below WebGL1's Uint16 vertex ceiling.
 return {vertices:new Float32Array(vertices),indices:new Uint16Array(indices)};
}
