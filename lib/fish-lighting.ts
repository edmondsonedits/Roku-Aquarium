/** Keep saturation and ink readable. Distance affects light, never fish opacity. */
export function fishWaterLighting(depth:number){
 const far=1-Math.max(0,Math.min(1,Number.isFinite(depth)?depth:.5));
 return {brightness:1-far*.075,haze:far*.065};
}
