"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import {fetchJson,readJsonResponse} from '../../lib/network-request';
import type { AquariumState, AquariumSummary } from '../../lib/aquarium-contracts';
export async function api<T>(url:string, body?:unknown):Promise<T> {
 if(body===undefined)return fetchJson<T>(url,{cache:'no-store'});
 // Do not introduce an ambiguous timeout for non-idempotent mutations such as room creation.
 const payload=JSON.stringify(body);
 try{
  const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:payload});
  return await readJsonResponse<T>(response,true);
 }catch(error){
  if(error instanceof TypeError || (error instanceof Error && error.name==='AbortError')){
   throw new Error('The connection was interrupted. The change may already have been saved. Check the aquarium before trying again.',{cause:error});
  }
  throw error;
 }
}
export function useAquarium(code:string) { const [state,setState]=useState<AquariumState|null>(null); const [summary,setSummary]=useState<AquariumSummary|null>(null); const [connection,setConnection]=useState('Connecting'); const [error,setError]=useState(''); const refresh=useRef<()=>void>(()=>{});
useEffect(()=>{ if(!code)return;let disposed=false,busy=false,timer:ReturnType<typeof setTimeout>,failures=0;const controller=new AbortController();const poll=async()=>{if(disposed||busy||document.hidden)return;busy=true;clearTimeout(timer);try{const data=await fetchJson<AquariumState>(`/api/aquariums/${code}`,{cache:'no-store',signal:controller.signal});if(disposed)return;setSummary(data);if(data.role)setState(data);setConnection('Live');setError('');failures=0;}catch(cause){if(disposed)return;failures++;setConnection('Reconnecting');setError(cause instanceof Error?cause.message:'Connection interrupted');}finally{busy=false;if(!disposed)timer=setTimeout(poll,Math.min(30000,3000*2**failures));}};const visible=()=>{if(!document.hidden)void poll();};refresh.current=()=>void poll();void poll();document.addEventListener('visibilitychange',visible);window.addEventListener('online',visible);return()=>{disposed=true;controller.abort();clearTimeout(timer);document.removeEventListener('visibilitychange',visible);window.removeEventListener('online',visible);};},[code]);
return {state,summary,setState,connection,error,refresh:useCallback(()=>refresh.current(),[])}; }
export type RememberedRoom={code:string;title:string};
export function rememberRoom(room:RememberedRoom){try{const previous=JSON.parse(localStorage.getItem('aquarium-rooms')||'[]') as RememberedRoom[];localStorage.setItem('aquarium-rooms',JSON.stringify([room,...previous.filter(item=>item.code!==room.code)].slice(0,20)));}catch{/* Host cookie remains available. */}}
export async function copyText(value:string){
 if(navigator.clipboard?.writeText){try{await navigator.clipboard.writeText(value);return;}catch{/* HTTP LAN or denied permission: use the user-initiated fallback. */}}
 const active=document.activeElement as HTMLElement|null;
 const field=document.createElement('textarea');field.value=value;field.setAttribute('readonly','');field.style.position='fixed';field.style.opacity='0';
 document.body.appendChild(field);
 try{field.select();if(!document.execCommand('copy'))throw new Error('Select and copy the text instead.');}
 finally{field.remove();active?.focus();}
}
