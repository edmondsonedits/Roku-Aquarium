import assert from 'node:assert/strict';
import test from 'node:test';
import { clamp, sampleSwim, separateFish, smooth, swimPersonality, type FishPose } from '../lib/fish-motion';

function baseline(poses: FishPose[]) {
  return poses.map((pose, i) => {
    let ox = 0, oy = 0;
    for (let j = 0; j < poses.length; j++) {
      if (i === j) continue;
      const other = poses[j]!;
      const dx = pose.x - other.x, dy = (pose.y - other.y) * .62;
      const distance = Math.hypot(dx, dy);
      if (distance >= .135) continue;
      const strength = smooth(1 - distance / .135) * .025, sign = i > j ? 1 : -1;
      ox += (distance > .0001 ? dx / distance : sign) * strength;
      oy += (distance > .0001 ? dy / distance : sign * .3) * strength;
    }
    return { ...pose, x: clamp(pose.x + ox, .14, .86), y: clamp(pose.y + oy, .18, .8) };
  });
}

test('separation skips distance calculations for distant fish without changing poses', () => {
  const original = Math.hypot;
  let calls = 0;
  const poses = Array.from({ length: 40 }, (_, i) => sampleSwim(swimPersonality(i), 17));
  const expected = baseline(poses);
  try {
    Math.hypot = (...values) => { calls++; return original(...values); };
    assert.deepEqual(separateFish(poses), expected);
  } finally { Math.hypot = original; }
  assert.ok(calls < 40 * 39 / 2, `expected fewer than half of all-pair distances, got ${calls}`);
});

test('separation remains exact across dense, boundary, reduced-motion and empty scenes', () => {
  for (const count of [0, 1, 10, 40]) for (const time of [0, 1, 17, 600]) {
    const poses = Array.from({ length: count }, (_, i) => sampleSwim(swimPersonality(i), time));
    assert.deepEqual(separateFish(poses), baseline(poses));
    const dense = poses.map(p => ({ ...p, x: .5, y: .5 }));
    assert.deepEqual(separateFish(dense), baseline(dense));
  }
  const p = sampleSwim(swimPersonality(1), 0, true);
  for (const dx of [.135 - Number.EPSILON, .135, .135 + Number.EPSILON]) {
    const poses = [p, { ...p, x: p.x + dx }];
    assert.deepEqual(separateFish(poses), baseline(poses));
  }
});
