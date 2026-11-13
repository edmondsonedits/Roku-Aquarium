/** Sparse suspended specks behind the school. Fixed count; no accumulating particles. */
export function waterMotes(seconds:number,width:number,height:number) {
 const time=Math.max(0,Number.isFinite(seconds)?seconds:0);
 return Array.from({length:28},(_,i)=>({
  x:((i*.61803398875+Math.sin(time*.035+i)*.018+1)%1)*width,
  y:(((i*.38196601125-time*(.0012+(i%4)*.0003))%1+1)%1)*height,
  radius:height*(.0006+(i%3)*.00035),
  alpha:.035+(i%4)*.018,
 }));
}
