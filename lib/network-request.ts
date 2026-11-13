/** Bound the complete response, including its body, so polling can recover on a lost LAN. */
export async function fetchJson<T>(url:string, init:RequestInit={}, timeoutMs=15000):Promise<T> {
 const controller=new AbortController();let timedOut=false;
 const cancel=()=>controller.abort(init.signal?.reason);
 if(init.signal?.aborted)cancel();else init.signal?.addEventListener('abort',cancel,{once:true});
 const timer=setTimeout(()=>{timedOut=true;controller.abort();},timeoutMs);
 try {
  const response=await fetch(url,{...init,signal:controller.signal});
  const data=await response.json() as T & {error?:string|{message?:string};message?:string};
  if(!response.ok)throw new Error(typeof data.error==='string'?data.error:data.error?.message||data.message||'Unable to connect. Please try again.');
  return data;
 }catch(error){if(timedOut)throw new Error('Connection timed out. Check the aquarium computer and Wi-Fi.');throw error;}
 finally {clearTimeout(timer);init.signal?.removeEventListener('abort',cancel);}
}
