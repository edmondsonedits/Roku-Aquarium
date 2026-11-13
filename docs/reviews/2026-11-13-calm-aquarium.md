# Calm aquarium review pass

## Why
Danny's 4.9-second TV recording showed moving fish, but rapid sticker-like travel,
straight fence-like foreground plants, a large persistent QR overlay, and a dense
reef with little readable water depth. This pass keeps the drawings as drawings
rather than attempting another crude volumetric extrusion.

## Changes
- Slow panoramic travel to roughly 29% of the prior path rate; retain independent,
  gentle tail beats instead of slowing all animation to a crawl.
- Broaden and slow the coral-crossing path. Do not artificially shrink a fish at
  the layer boundary. Actual near/far depth still controls size.
- Keep horizontal turn narrowing independent of depth velocity. A review caught
  a near-90%-width flip when both velocities approached zero; a 40-seed, 60fps
  regression now covers that combination.
- Add restrained underwater lighting to WebGL fish, never fade opaque ink into
  ghost transparency. Canvas fallback remains artwork-preserving.
- Replace uniform green poles with uneven seeded clumps, five individually
  tapered and curved blades, varied green tones and fixed-root sway.
- Reduce foreground coral to the lower outer corners, leaving more open water
  and the birthday sign composition visible.
- Add three faint light rays and 28 bounded suspended motes behind the fish.
  The existing bubbles toggle controls these effects too. Pause/reduced-motion
  behavior remains respected. Positive modulo keeps motes valid for all-day use.
- Collapse TV QR into a Join chip by default. Expand explicitly for scanning.
  Watch mode removes nonessential overlays without timer-driven surprises;
  a labelled Controls affordance remains available.

## Scope and limits
No storage schema, artwork bytes, server authorization, network settings,
Windows updater, or saved-video handling changes. No merge or deployment.

The supplied video was inspected as sampled frames, not accepted as proof of
this new revision. Headless Chromium cannot launch in this execution environment
(socket EPERM); cloud browser cannot reach the local test server. Consequently
full-turn, coral-crossing, typography and performance visual acceptance remain
unverified. Automated tests are not a substitute for those checks.
