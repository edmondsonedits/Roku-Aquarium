/** Read the body once and keep transport failures distinct from invalid JSON. */
export async function readJsonResponse<T>(response:Response, mutation=false):Promise<T> {
 const fallback=`The aquarium computer returned an unreadable response (HTTP ${response.status}). Check the aquarium computer and Wi-Fi.`;
 const uncertain=' The change may already have been saved. Check the aquarium before trying again.';
 let data:unknown;
 try {data=await response.json();}
 catch(error) {
  // Cancellation/body transport failures must retain their original identity.
  if(!(error instanceof SyntaxError))throw error;
  throw new Error(fallback+(mutation?uncertain:''));
 }
 if(!response.ok){
  const body=data&&typeof data==='object'?data as Record<string,unknown>:{};
  const nested=body.error&&typeof body.error==='object'?(body.error as Record<string,unknown>).message:undefined;
  const message=[body.error,nested,body.message].find(value=>typeof value==='string'&&value.trim());
  throw new Error(typeof message==='string'?message:fallback+(mutation?uncertain:''));
 }
 return data as T;
}

/** Bound the complete response, including its body, so polling can recover on a lost LAN. */
export async function fetchJson<T>(url:string, init:RequestInit={}, timeoutMs=15000):Promise<T> {
 const controller=new AbortController();let timedOut=false;
 const cancel=()=>controller.abort(init.signal?.reason);
 if(init.signal?.aborted)cancel();else init.signal?.addEventListener('abort',cancel,{once:true});
 const timer=setTimeout(()=>{timedOut=true;controller.abort();},timeoutMs);
 try {
  const response=await fetch(url,{...init,signal:controller.signal});
  return await readJsonResponse<T>(response);
 }catch(error){if(timedOut)throw new Error('Connection timed out. Check the aquarium computer and Wi-Fi.');throw error;}
 finally {clearTimeout(timer);init.signal?.removeEventListener('abort',cancel);}
}
