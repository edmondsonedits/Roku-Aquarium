import React from 'react';
/** Kept inside the fullscreen element so colleagues can join without interrupting playback. */
export function TvJoinCard({qr,code,visible}:{qr:string;code:string;visible:boolean}){
 if(!visible||!qr)return null;
 return <aside className="tv-join-card" aria-label="Join this aquarium"><img src={qr} alt={`Scan to join aquarium ${code}`} width={256} height={256}/><strong>Scan to add your fish</strong><span className="tv-room-code"><span className="sr-only">Room code </span>{code}</span><small>Same Wi-Fi as this laptop</small></aside>;
}
