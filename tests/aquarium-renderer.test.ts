import assert from 'node:assert/strict';
import test from 'node:test';
import { FishMesh, fishSize } from '../app/components/fish/FishMesh';
import { sampleSwim, swimPersonality } from '../lib/fish-motion';
import type { FishFinalePublicEntry } from '../lib/arcade/fish-finale';

const entry: FishFinalePublicEntry = { id: 'fish', label: 'Fish', practice: false, appearanceSeed: 1, width: 1024, height: 768, bounds: { x: .1, y: .2, width: .8, height: .6 }, anchors: { head: { x: .8, y: .5 }, body: { x: .5, y: .5 }, tail: { x: .16, y: .5 } } };
test('aquarium mesh assigns all forty fish distinct valid depth bands and releases removed assets', () => {
  const bands: number[][] = [], deleted: unknown[] = [];
  const gl = new Proxy({ canvas: { width: 1920, height: 1080 } }, { get(target, name) {
    if (name === 'canvas') return target.canvas;
    if (name === 'depthRange') return (near: number, far: number) => bands.push([near, far]);
    if (name === 'deleteTexture' || name === 'deleteBuffer') return (value: unknown) => deleted.push(value);
    if (name === 'getShaderParameter' || name === 'getProgramParameter') return () => true;
    if (String(name).startsWith('create')) return () => ({});
    return () => undefined;
  } });
  const mesh = new FishMesh({ getContext: () => gl } as unknown as HTMLCanvasElement);
  const assets = (mesh as unknown as { assets: Map<string, unknown> }).assets;
  const texture = {}, vertices = {}, indices = {};
  assets.set('fish', { texture, vertices, indices, count: 6 });
  mesh.begin(1920, 1080, 40);
  const pose = sampleSwim(swimPersonality(1), 0);
  for (let i = 0; i < 40; i++) mesh.draw(entry, pose, 1920, 1080);
  assert.equal(bands.length, 41);
  for (const [near, far] of bands.slice(1)) { assert.ok(near >= 0 && far <= 1 && near < far); }
  assert.equal(new Set(bands.slice(1).map(band => band[1])).size, 40);
  mesh.remove('fish');
  assert.equal(assets.size, 0);
  assert.deepEqual(deleted, [texture, vertices, indices]);
  mesh.remove('fish');
  assert.equal(deleted.length, 3);
  mesh.dispose();
});
test('sparse artwork remains bounded and retains its source aspect ratio', () => {
  const pose = sampleSwim(swimPersonality(4), 0);
  for (const bounds of [entry.bounds, { x: .5, y: .5, width: .001, height: .001 }]) {
    const size = fishSize({ ...entry, bounds }, pose, 1920, 1080);
    assert.ok(Number.isFinite(size.width) && size.width > 0);
    assert.equal(size.width / size.height, 1024 / 768);
    assert.ok(size.width < 2400);
  }
});
