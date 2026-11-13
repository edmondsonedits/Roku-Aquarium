import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import Home from '../app/page';
import Join from '../app/join/page';

test('home distinguishes laptop hosting from phone participation before creation',()=>{
 const html=renderToStaticMarkup(React.createElement(Home));
 assert.match(html,/Create this on the laptop connected to your TV/);
 assert.match(html,/Coworkers join the existing aquarium on their phones/);
});
test('join explains where to find the code and associates help with the input',()=>{
 const html=renderToStaticMarkup(React.createElement(Join));
 assert.match(html,/id="code"[^>]*aria-describedby="code-help"/);
 assert.match(html,/id="code-help"/);
 assert.match(html,/same local network as the aquarium laptop/);
});
test('host setup help is optional and explains persistent media and local connectivity',async()=>{
 const {HostSetupGuide}=await import('../app/components/HostSetupGuide');
 const html=renderToStaticMarkup(React.createElement(HostSetupGuide));
 assert.match(html,/<details class="host-setup">/);
 assert.match(html,/<summary>Set up the TV and phones<\/summary>/);
 assert.match(html,/Keep the laptop awake/);
 assert.match(html,/same local network/);
 assert.match(html,/saved on this laptop/);
 assert.doesNotMatch(html,/<button|<input/);
});
