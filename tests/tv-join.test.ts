import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {TvJoinCard} from '../app/components/TvJoinCard';
test('TV join card includes scannable image and room code without recovery key',()=>{
 const html=renderToStaticMarkup(React.createElement(TvJoinCard,{qr:'data:image/png;base64,test',code:'ABC234',visible:true}));
 assert.match(html,/ABC234/);assert.match(html,/Scan to add your fish/);assert.match(html,/data:image/);
});
test('TV join card can be hidden for an unobstructed aquarium',()=>{
 assert.equal(renderToStaticMarkup(React.createElement(TvJoinCard,{qr:'data:image/png;base64,test',code:'ABC234',visible:false})), '');
});
test('TV join card reserves a larger square image and labels the fallback room code',()=>{
 const html=renderToStaticMarkup(React.createElement(TvJoinCard,{qr:'data:image/png;base64,test',code:'ABC234',visible:true}));
 assert.match(html,/width="256" height="256"/);
 assert.match(html,/<span class="sr-only">Room code <\/span>ABC234/);
});
