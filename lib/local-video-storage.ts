/** Browser-only video vault. Video bytes never leave this device. */
export type StoredVideo = { room: string; name: string; type: string; size: number; savedAt: number; fileName: string; driver: 'opfs' | 'idb'; persistent: boolean };
export interface VideoStorageBackend {
 estimate(): Promise<{ quota?: number; usage?: number }>;
 persist(): Promise<boolean>;
 readRecord(room: string): Promise<StoredVideo | null>;
 writeRecord(record: StoredVideo): Promise<void>;
 clearRecord(room: string): Promise<void>;
 writeFile(key: string, blob: Blob, progress?: (bytes:number,total:number)=>void): Promise<'opfs' | 'idb'>;
 readFile(record: StoredVideo): Promise<Blob | null>;
 deleteFile(record: StoredVideo): Promise<void>;
}
function database(): Promise<IDBDatabase> {
 return new Promise((resolve,reject)=>{const r=indexedDB.open('work-aquarium-video-v1',1);r.onupgradeneeded=()=>{r.result.createObjectStore('records');r.result.createObjectStore('blobs');};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.onblocked=()=>reject(new Error('Local storage is blocked.'));});
}
async function read<T>(store:string,key:string):Promise<T|null>{const db=await database();try{return await new Promise((resolve,reject)=>{const r=db.transaction(store).objectStore(store).get(key);r.onsuccess=()=>resolve(r.result??null);r.onerror=()=>reject(r.error);});}finally{db.close();}}
async function write(store:string,key:string,value?:unknown):Promise<void>{const db=await database();try{await new Promise<void>((resolve,reject)=>{const tx=db.transaction(store,'readwrite');if(value===undefined)tx.objectStore(store).delete(key);else tx.objectStore(store).put(value,key);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error??new Error('Local save interrupted.'));});}finally{db.close();}}
async function directory(){return navigator.storage.getDirectory();}
export const browserVideoStorage: VideoStorageBackend = {
 estimate:()=>navigator.storage?.estimate?.()??Promise.resolve({}),
 persist:async()=>{try{return await navigator.storage?.persist?.()??false;}catch{return false;}},
 readRecord:room=>read<StoredVideo>('records',room),writeRecord:record=>write('records',record.room,record),clearRecord:room=>write('records',room),
 async writeFile(key,blob,progress){
  // Stream directly to OPFS: a 1GB backdrop never becomes one giant ArrayBuffer.
  if(typeof navigator.storage?.getDirectory === 'function'){
   const root=await directory();const handle=await root.getFileHandle(key,{create:true});let writer:FileSystemWritableFileStream|undefined;
   try{writer=await handle.createWritable();const reader=blob.stream().getReader();let bytes=0;try{while(true){const item=await reader.read();if(item.done)break;await writer.write(item.value);bytes+=item.value.byteLength;progress?.(bytes,blob.size);}}finally{reader.releaseLock();}await writer.close();return 'opfs';}
   catch(error){try{await writer?.abort();}catch{}try{await root.removeEntry(key);}catch{}throw error;}
  }
  // IndexedDB supports Blob values without a base64 or full-memory conversion.
  await write('blobs',key,blob);progress?.(blob.size,blob.size);return 'idb';
 },
 async readFile(record){if(record.driver==='idb')return read<Blob>('blobs',record.fileName);try{return await(await(await directory()).getFileHandle(record.fileName)).getFile();}catch(error){if(error instanceof DOMException&&error.name==='NotFoundError')return null;throw error;}},
 async deleteFile(record){if(record.driver==='idb')await write('blobs',record.fileName);else try{await(await directory()).removeEntry(record.fileName);}catch(error){if(!(error instanceof DOMException&&error.name==='NotFoundError'))throw error;}},
};
export async function saveLocalVideo(room:string,file:File,backend:VideoStorageBackend=browserVideoStorage,progress?:(bytes:number,total:number)=>void):Promise<StoredVideo>{
 if(!file.size)throw new Error('Choose a video with content.');
 if(!file.type.startsWith('video/')&&!/\.(mp4|webm|mov|m4v|ogv|ogg)$/i.test(file.name))throw new Error('Choose an MP4, WebM or another browser-supported video.');
 const previous=await backend.readRecord(room);const estimate=await backend.estimate().catch(()=>({} as {quota?:number;usage?:number}));
 if(estimate.quota!==undefined&&estimate.usage!==undefined&&estimate.quota-estimate.usage<file.size*1.05+16*1024*1024)throw new DOMException('Not enough local space to save this video safely.','QuotaExceededError');
 const persistent=await backend.persist();const fileName=`aquarium-${room.replace(/[^a-z0-9]/gi,'')}-${crypto.randomUUID()}`;let driver:'opfs'|'idb'|undefined;
 try{driver=await backend.writeFile(fileName,file,progress);const record:StoredVideo={room,name:file.name,type:file.type,size:file.size,savedAt:Date.now(),fileName,driver,persistent};await backend.writeRecord(record);if(previous)await backend.deleteFile(previous).catch(()=>{});return record;}
 catch(error){if(driver)await backend.deleteFile({room,name:file.name,type:file.type,size:file.size,savedAt:Date.now(),fileName,driver,persistent}).catch(()=>{});throw error;}
}
export async function loadLocalVideo(room:string,backend:VideoStorageBackend=browserVideoStorage):Promise<{record:StoredVideo;blob:Blob}|null>{const record=await backend.readRecord(room);if(!record)return null;const blob=await backend.readFile(record);if(!blob){await backend.clearRecord(room);return null;}return{record,blob};}
export async function forgetLocalVideo(room:string,backend:VideoStorageBackend=browserVideoStorage){const record=await backend.readRecord(room);if(record)await backend.deleteFile(record);await backend.clearRecord(room);}
export function videoStorageError(error:unknown):string{if(error instanceof DOMException&&error.name==='QuotaExceededError')return 'Not enough browser storage space for this video. It can still play this session. Free space or use a smaller file, then choose it again to save.';return 'This browser could not remember the video. It can still play this session; use a normal browser window and choose it again next time.';}
