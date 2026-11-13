import {test} from 'node:test';
import assert from 'node:assert/strict';
import {listenFailureMessage} from './startup-error';
test('occupied port explains safe recovery without switching ports',()=>{
 const message=listenFailureMessage({code:'EADDRINUSE'},4317);
 assert.match(message,/4317.*already in use/);
 assert.match(message,/existing aquarium/);
 assert.match(message,/Do not start two/);
});
test('permission failures do not recommend weakening network security',()=>{
 for(const code of ['EACCES','EPERM']){
  const message=listenFailureMessage({code},5000);
  assert.match(message,/5000/);assert.match(message,/workplace IT/);
  assert.doesNotMatch(message,/administrator|disable|sudo/);
 }
});
test('unknown errors retain diagnostic detail and handle non-errors',()=>{
 assert.match(listenFailureMessage(new Error('test failure'),4317),/test failure/);
 assert.match(listenFailureMessage(null,4317),/could not start/);
});
