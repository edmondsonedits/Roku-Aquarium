/** A continuous artwork sheet, not an alpha-thresholded voxel extrusion.
 * Texture alpha alone defines the silhouette, preserving fine and translucent ink.
 * Shared vertices keep the tail deformation continuous without strips or cracks. */
export function buildFishSurface(): {vertices: Float32Array; indices: Uint16Array} {
 const columns=48, rows=16, vertices:number[]=[], indices:number[]=[];
 for(let y=0;y<=rows;y++)for(let x=0;x<=columns;x++){
  const u=x/columns,v=y/rows;vertices.push(u,v,0,u,v);
 }
 for(let y=0;y<rows;y++)for(let x=0;x<columns;x++){
  const a=y*(columns+1)+x,b=a+1,d=a+columns+1,c=d+1;
  indices.push(a,b,c,a,c,d);
 }
 return {vertices:new Float32Array(vertices),indices:new Uint16Array(indices)};
}
