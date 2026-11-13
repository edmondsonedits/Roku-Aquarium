import type {ServerResponse} from 'node:http';
import type {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';

/** A browser can cancel a download when navigating or seeking video. */
export async function streamResponse(source:Readable,response:ServerResponse){
 let clientDisconnected=false;
 // Register before pipeline: its cleanup destroys the source too. A source
 // failure has already destroyed the source when it closes the response.
 const onClose=()=>{clientDisconnected=!response.writableFinished&&!source.destroyed;};
 response.once('close',onClose);
 try{await pipeline(source,response);}
 catch(error){
  const code=(error as NodeJS.ErrnoException)?.code;
  if(clientDisconnected&&(code==='ERR_STREAM_PREMATURE_CLOSE'||code==='ECONNRESET'))return;
  throw error;
 }finally{response.off('close',onClose);}
}
