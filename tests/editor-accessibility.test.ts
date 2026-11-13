import test from 'node:test';
import assert from 'node:assert/strict';
import {colorLabel, PALETTE_COLORS, manageDisclosureFocus} from '../lib/editor-accessibility';

test('every palette colour has a human-readable name and its precise code',()=>{
 for(const color of PALETTE_COLORS){assert.match(colorLabel(color),/^Use [a-z][a-z -]+ \(#[A-F0-9]{6}\)$/i);}
 assert.equal(colorLabel('#ffffff'),'Use white (#FFFFFF)');
 assert.equal(colorLabel('#123456'),'Use colour #123456');
});
function fixture(){
 let active: object|null=null;const calls:string[]=[];
 const trigger={isConnected:true,disabled:false,focus(){active=trigger;calls.push('trigger');}};
 const input={focus(){active=input;calls.push('input');}};
 const outside={};const body={};
 const panel={contains:(node:object|null)=>node===input,querySelector:()=>input};
 active=trigger;
 return {trigger,input,outside,body,panel,calls,get active(){return active;},set active(value:object|null){active=value;}};
}
test('disclosure focuses its first control and restores its opener on close',()=>{
 const f=fixture();const close=manageDisclosureFocus(f.panel,f.trigger,()=>f.active,f.body);
 assert.deepEqual(f.calls,['input']);close();assert.deepEqual(f.calls,['input','trigger']);
});
test('closing after focus moved elsewhere does not steal focus',()=>{
 const f=fixture();const close=manageDisclosureFocus(f.panel,f.trigger,()=>f.active,f.body);
 f.active=f.outside;close();assert.deepEqual(f.calls,['input']);
});
test('closing a removed panel can restore focus but never targets a disabled opener',()=>{
 const f=fixture();const close=manageDisclosureFocus(f.panel,f.trigger,()=>f.active,f.body);
 f.active=f.body;f.trigger.disabled=true;close();assert.deepEqual(f.calls,['input']);
});
test('a disconnected opener is never focused after the editor unmounts',()=>{
 const f=fixture();const close=manageDisclosureFocus(f.panel,f.trigger,()=>f.active,f.body);
 f.active=f.body;f.trigger.isConnected=false;close();assert.deepEqual(f.calls,['input']);
});
