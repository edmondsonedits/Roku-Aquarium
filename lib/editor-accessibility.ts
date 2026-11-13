import {DRAWING_COLORS} from './drawing-studio';
export const GRADIENT_COLORS = ['#E05252','#E07D52','#E0A752','#E0D252','#C4E052','#99E052','#6FE052','#52E060','#52E08B','#52E0B5','#52E0E0','#52B5E0','#528BE0','#5260E0','#6F52E0','#9952E0','#C452E0','#E052D2','#E052A7','#E0527D'] as const;
export const PALETTE_COLORS = [...DRAWING_COLORS,...GRADIENT_COLORS];
const NAMES = ['navy','white','coral','orange','yellow','green','blue','lavender','red','terracotta','ochre','gold','yellow green','lime','leaf green','bright green','mint','sea green','cyan','sky blue','cornflower blue','indigo','violet','purple','orchid','magenta','pink','rose'];
export function colorLabel(value:string):string {
 const code=value.toUpperCase();const index=PALETTE_COLORS.findIndex(color=>color===code);
 return index<0?`Use colour ${code}`:`Use ${NAMES[index]} (${code})`;
}
type FocusTarget={focus:()=>void;isConnected?:boolean;disabled?:boolean};
type FocusPanel<T>={contains:(node:T)=>boolean;querySelector:(selector:string)=>FocusTarget|null};
/** Non-modal disclosure: focus enters it, but closing must not steal focus from another control. */
export function manageDisclosureFocus<T>(panel:FocusPanel<T>,opener:FocusTarget|null,getActive:()=>T,body:T):()=>void {
 panel.querySelector('button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex="0"]')?.focus();
 return ()=>{
  const active=getActive();
  if(opener?.isConnected!==false&&!opener?.disabled&&(active===body||panel.contains(active)))opener?.focus();
 };
}
