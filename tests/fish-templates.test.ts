import assert from 'node:assert/strict';
import test from 'node:test';
import { FISH_BODY_TEMPLATES, traceBodyTemplate } from '../lib/fish-templates';
import { emptyFishDocument, parseFishDraft, validFishDocument, fillFishPixels } from '../lib/fish-art';

test('twelve distinct simple and advanced bodies stay within the artboard and face right', () => {
  assert.equal(FISH_BODY_TEMPLATES.length, 12);
  assert.equal(new Set(FISH_BODY_TEMPLATES.map(t => t.path)).size, 12);
  assert.ok(FISH_BODY_TEMPLATES.filter(t => t.level === 'Simple').length >= 5);
  assert.ok(FISH_BODY_TEMPLATES.filter(t => t.level === 'Advanced').length >= 5);
  for (const template of FISH_BODY_TEMPLATES) {
    assert.equal(template.commands[0][0], 'M');
    assert.deepEqual(template.commands[0].slice(1), [820, 384]);
    assert.equal(template.commands.at(-1)?.[0], 'Z');
    for (const command of template.commands) for (let i = 1; i < command.length; i++) {
      const coordinate = command[i] as number;
      assert.ok(coordinate >= 32 && coordinate <= (i % 2 ? 992 : 736), template.name);
    }
    const calls: string[] = [];
    const ctx = new Proxy({}, { get: (_, name) => () => calls.push(String(name)) }) as CanvasRenderingContext2D;
    traceBodyTemplate(ctx, template.id);
    assert.equal(calls[0], 'beginPath');
    assert.equal(calls.at(-1), 'closePath');
  }
});

test('every shape remains editable and survives draft recovery with paint and additions', () => {
  for (const template of FISH_BODY_TEMPLATES) {
    const fish = { ...emptyFishDocument(), bodyShape: template.id };
    fish.body.push({ kind: 'fill', point: { x: .55, y: .5 }, color: '#FFFFFF' });
    fish.free.push({ kind: 'stroke', tool: 'pen', color: '#FF0000', size: 24, points: [{ x: .5, y: .2 }] });
    assert.ok(validFishDocument(fish));
    assert.deepEqual(parseFishDraft(JSON.stringify(fish)), fish);
  }
  assert.equal(parseFishDraft(JSON.stringify({ ...emptyFishDocument(), bodyShape: 'unknown' })), null);
  assert.ok(validFishDocument(emptyFishDocument()));
});

test('bucket recolours opaque template pixels without painting transparent exterior', () => {
  const pixels = new Uint8ClampedArray(5 * 5 * 4);
  for (let y = 1; y < 4; y++) for (let x = 1; x < 4; x++) pixels.set([255, 244, 214, 255], (y * 5 + x) * 4);
  assert.equal(fillFishPixels(pixels, 5, 5, 2, 2, '#FFFFFF'), true);
  assert.deepEqual([...pixels.slice(48, 52)], [255,255,255,255]);
  assert.equal(fillFishPixels(pixels, 5, 5, 0, 0, '#FF0000'), false);
  for (let i = 0; i < 5; i++) assert.equal(pixels[i * 4 + 3], 0);
});

test('changing only the body shape rebuilds its mask and keeps paint alpha-clipped', async () => {
  const { renderFish } = await import('../lib/fish-art');
  const layers: { canvas: HTMLCanvasElement; composites: string[]; paths: number[][] }[] = [];
  const surface = (width: number, height: number) => {
    const record = { canvas: { width, height } as HTMLCanvasElement, composites: [] as string[], paths: [] as number[][] };
    const context = new Proxy({ canvas: record.canvas, moveTo(...args: number[]) { record.paths.push(args); }, lineTo(...args: number[]) { record.paths.push(args); } }, {
      get: (target, key) => key in target ? target[key as keyof typeof target] : () => {},
      set(target, key, value) { if (key === 'globalCompositeOperation') record.composites.push(value); Reflect.set(target, key, value); return true; },
    }) as unknown as CanvasRenderingContext2D;
    record.canvas.getContext = (() => context) as unknown as typeof record.canvas.getContext;
    layers.push(record); return record.canvas;
  };
  const destination = surface(1024,768);
  const fish = emptyFishDocument();
  fish.body.push({ kind: 'stroke', tool: 'pen', color: '#FFFFFF', size: 64, points: [{ x: .01, y: .01 }, { x: .8, y: .5 }] });
  for (const template of FISH_BODY_TEMPLATES) {
    const previous = layers.length;
    renderFish(destination.getContext('2d')!, { ...fish, bodyShape: template.id }, surface);
    assert.ok(layers.length > previous, `${template.name} invalidates cached geometry`);
    assert.deepEqual(layers[previous].paths[0], [820,384]);
    assert.ok(layers[previous].composites.includes('source-atop'), `${template.name} clips paint to body alpha`);
    assert.ok(layers[previous].paths.every(point => point[0] > 0 && point[0] < 1024 && point[1] > 0 && point[1] < 768), 'no exterior/background rectangle');
  }
});
