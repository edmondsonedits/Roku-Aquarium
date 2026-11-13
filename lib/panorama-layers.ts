/** World-aligned procedural foreground. It adds depth without moving imperfect
 * source-image cutouts away from their matching background pixels. */
export function foregroundFronds(progress:number,width:number,height:number,seconds:number) {
 const world=width*1.9;
 return Array.from({length:9},(_,i)=>({
  x:(i/8)*world-progress*(world-width),
  y:height*1.04,
  height:height*(.24+(i%3)*.055),
  sway:Math.sin(seconds*.55+i*1.7)*height*.012,
  width:Math.max(2,height*.002),
 }));
}
