import test from 'node:test';
import assert from 'node:assert/strict';
import {requestShiftChange} from '../lib/shift-actions';

test('canceling End shift leaves the shared session untouched', async () => {
  const changes: string[] = [];
  let message = '';
  await requestShiftChange(true, text => {message = text; return false;}, async body => {changes.push(body.action);});
  assert.deepEqual(changes, []);
  assert.match(message, /stop accepting new fish/i);
  assert.match(message, /remove.*swimming/i);
  assert.match(message, /saved/i);
});
test('confirmed end sends exactly one end action', async () => {
  const events: string[] = [];
  await requestShiftChange(true, () => {events.push('confirmed'); return true;}, async body => {events.push(body.action);});
  assert.deepEqual(events, ['confirmed', 'end']);
});
test('starting a shift is a direct action without a confirmation', async () => {
  const changes: string[] = [];
  await requestShiftChange(false, () => {throw new Error('unexpected confirmation');}, async body => {changes.push(body.action);});
  assert.deepEqual(changes, ['start']);
});
test('failed controls are not automatically retried', async () => {
  let calls = 0;
  const failure = new Error('connection lost');
  await assert.rejects(requestShiftChange(true, () => true, async () => {calls++; throw failure;}), error => error === failure);
  assert.equal(calls, 1);
});
