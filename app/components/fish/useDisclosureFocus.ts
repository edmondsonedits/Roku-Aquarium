import {useEffect,type RefObject} from 'react';
import {manageDisclosureFocus} from '../../../lib/editor-accessibility';
export function useDisclosureFocus(open:boolean,panel:RefObject<HTMLElement|null>){
 useEffect(()=>{
  if(!open||!panel.current)return;
  const opener=document.activeElement instanceof HTMLElement?document.activeElement:null;
  return manageDisclosureFocus(panel.current,opener,()=>document.activeElement,document.body);
 },[open,panel]);
}
