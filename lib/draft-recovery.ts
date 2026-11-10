import {fishHasArtwork,parseFishDraft} from './fish-art';
type DraftStorage=Pick<Storage,'getItem'|'setItem'|'key'|'length'>;
export function savedDrafts(storage:DraftStorage,code:string,current:string):{id:string;name:string;pending:boolean}[]{
 const prefix=`aquarium-draft:${code}:`,result=[];
 for(let i=0;i<storage.length;i++){
  const key=storage.key(i);if(!key?.startsWith(prefix))continue;
  const id=key.slice(prefix.length);if(id===current)continue;
  try{const stored=JSON.parse(storage.getItem(key)||'null');const fish=parseFishDraft(JSON.stringify(stored?.fish??stored));const delivery=storage.getItem(`aquarium-delivery-action:${id}`)||id;
   if(!fish||!fishHasArtwork(fish)||stored?.accepted||storage.getItem(`aquarium-receipt:${delivery}`))continue;
   result.push({id,name:storage.getItem(`aquarium-fish-name:${id}`)||'Untitled fish',pending:!!stored?.frozen});
  }catch{/* Ignore a corrupt draft without hiding other recoverable artwork. */}
 }
 return result;
}
export async function recoverDraft(storage:DraftStorage,code:string,source:string,target:string,copyPending:(from:string,to:string)=>Promise<void>):Promise<void>{
 const from=`aquarium-draft:${code}:${source}`,to=`aquarium-draft:${code}:${target}`;
 const raw=storage.getItem(from);if(!raw)throw new Error('That draft is no longer on this device.');
 const stored=JSON.parse(raw),fish=parseFishDraft(JSON.stringify(stored?.fish??stored));
 if(!fish)throw new Error('That saved draft could not be read.');
 const delivery=storage.getItem(`aquarium-delivery-action:${source}`)||source;
 if(stored?.accepted||storage.getItem(`aquarium-receipt:${delivery}`))throw new Error('That fish is already saved in the aquarium.');
 // Editable drafts fork into an independent action. Pending deliveries remain
 // immutable and reuse the original delivery ID, including copies of copies.
 if(stored?.frozen){await copyPending(from,to);storage.setItem(`aquarium-delivery-action:${target}`,delivery);}
 storage.setItem(to,JSON.stringify({fish,accepted:false,frozen:!!stored?.frozen}));
 storage.setItem(`aquarium-fish-name:${target}`,storage.getItem(`aquarium-fish-name:${source}`)||'');
}
