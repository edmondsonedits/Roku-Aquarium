import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_PAINT_SETTINGS, changePaintSetting } from '../lib/paint-settings';

test('eraser adjustments preserve brush and spray settings', () => {
 const settings = changePaintSetting(DEFAULT_PAINT_SETTINGS, 'eraser', {size: 60, opacity: .3});
 assert.deepEqual(settings.eraser, {size: 60, opacity: .3});
 assert.deepEqual(settings.pen, {size: 14, opacity: 1});
 assert.deepEqual(settings.spray, {size: 144, opacity: .5});
 assert.equal(DEFAULT_PAINT_SETTINGS.eraser.size, 14);
});
test('switching between tools retains each last choice', () => {
 let settings = changePaintSetting(DEFAULT_PAINT_SETTINGS, 'pen', {size: 4});
 settings = changePaintSetting(settings, 'eraser', {size: 50});
 settings = changePaintSetting(settings, 'spray', {opacity: .2});
 assert.equal(settings.pen.size, 4);
 assert.equal(settings.eraser.size, 50);
 assert.equal(settings.spray.opacity, .2);
});
