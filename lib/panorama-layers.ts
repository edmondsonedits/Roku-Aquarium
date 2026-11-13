/** Seeded, uneven foreground clumps. Presentation only; saved art is untouched. */
export function foregroundFronds(progress:number,width:number,height:number,seconds:number) {
 const world=width*1.9;
 const anchors=[.015,.052,.185,.29,.36,.64,.755,.91,.975];
 const heights=[.19,.28,.23,.34,.21,.29,.37,.24,.31];
 return anchors.map((anchor,i)=>({
  x:anchor*world-progress*(world-width),
  y:height*(1.035+(i%3)*.012),
  height:height*heights[i]!,
  sway:(Math.sin(seconds*.42+i*1.7)*.011+Math.sin(seconds*.21+i)*.006)*height,
  width:height*(.009+(i%3)*.002),
  lean:height*(i%2===0?-.035:.045),
  hue:145+(i%4)*9,
 }));
}

/** A tapered blade in plant-local space. Its base stays fixed as the tip sways. */
export function frondBlade(height:number,width:number,lean:number,sway:number) {
 return {
  leftControl1:{x:-width*.7,y:-height*.24},
  leftControl2:{x:lean+sway-width*1.8,y:-height*.7},
  tip:{x:lean+sway,y:-height},
  rightControl1:{x:lean+sway+width*.7,y:-height*.64},
  rightControl2:{x:width*.7,y:-height*.2},
 };
}
