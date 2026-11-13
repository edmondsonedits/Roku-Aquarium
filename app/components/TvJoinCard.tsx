import React, {useEffect,useRef} from 'react';
/** Do not steal focus on mount or when another host control changes QR visibility. */
export function restoreRequestedJoinFocus(request:{current:boolean},target:Pick<HTMLButtonElement,'focus'>|null){
 if(!request.current||!target)return;
 request.current=false;target.focus({preventScroll:true});
}
/** Compact by default; an intentional tap expands the high-contrast scannable QR. */
export function TvJoinCard({qr,code,visible,onToggle}:{qr:string;code:string;visible:boolean;onToggle?:()=>void}){
 const toggleTarget=useRef<HTMLButtonElement>(null);
 const focusRequested=useRef(false);
 useEffect(()=>{restoreRequestedJoinFocus(focusRequested,toggleTarget.current);},[visible]);
 function toggle(){if(!onToggle)return;focusRequested.current=true;onToggle();}
 if(!qr)return null;
 if(!visible)return onToggle?<button className="tv-join-chip" ref={toggleTarget} onClick={toggle} aria-label="Show join QR code" aria-expanded={false}>Join · <span>{code}</span></button>:null;
 return <aside className="tv-join-card" aria-label="Join this aquarium">{onToggle&&<button className="tv-join-close" ref={toggleTarget} onClick={toggle} aria-label="Hide join QR code" aria-expanded={true}>Close ×</button>}<img src={qr} alt={`Scan to join aquarium ${code}`} width={256} height={256}/><strong>Scan to add your fish</strong><span className="tv-room-code"><span className="sr-only">Room code </span>{code}</span><small>Same Wi-Fi as this laptop</small></aside>;
}
