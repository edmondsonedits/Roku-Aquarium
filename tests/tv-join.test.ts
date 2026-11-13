import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {TvJoinCard} from '../app/components/TvJoinCard';
test('TV join card includes scannable image and room code without recovery key',()=>{
 const html=renderToStaticMarkup(React.createElement(TvJoinCard,{qr:'data:image/png;base64,test',code:'ABC234',visible:true}));
 assert.match(html,/ABC234/);assert.match(html,/Scan to add your fish/);assert.match(html,/data:image/);
});
test('collapsed TV join card keeps a compact accessible join button, not a large QR',()=>{
 const html=renderToStaticMarkup(React.createElement(TvJoinCard,{qr:'data:image/png;base64,test',code:'ABC234',visible:false,onToggle:()=>{}}));
 assert.match(html,/Show join QR code/);assert.match(html,/ABC234/);assert.doesNotMatch(html,/<img/);assert.match(html,/aria-expanded="false"/);
});
test('expanded card can be collapsed without leaving fullscreen',()=>{
 const html=renderToStaticMarkup(React.createElement(TvJoinCard,{qr:'data:image/png;base64,test',code:'ABC234',visible:true,onToggle:()=>{}}));
 assert.match(html,/Hide join QR code/);assert.match(html,/aria-expanded="true"/);
});
test('TV join card reserves a larger square image and labels the fallback room code',()=>{
 const html=renderToStaticMarkup(React.createElement(TvJoinCard,{qr:'data:image/png;base64,test',code:'ABC234',visible:true}));
 assert.match(html,/width="256" height="256"/);
 assert.match(html,/<span class="sr-only">Room code <\/span>ABC234/);
});
test('QR focus handoff happens once per explicit toggle, never on initial display',async()=>{
 const {restoreRequestedJoinFocus}=await import('../app/components/TvJoinCard');
 let focused=0;const target={focus:()=>{focused++;}};const request={current:false};
 restoreRequestedJoinFocus(request,target);assert.equal(focused,0);
 request.current=true;restoreRequestedJoinFocus(request,target);assert.equal(focused,1);assert.equal(request.current,false);
 restoreRequestedJoinFocus(request,target);assert.equal(focused,1);
 request.current=true;restoreRequestedJoinFocus(request,target);assert.equal(focused,2);
});
