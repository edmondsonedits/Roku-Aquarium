# Performance pass: bounded fish-separation work

## Finding and change
The animation's separation loop computed a Euclidean distance for all 1,560 ordered pairs in a 40-fish scene each frame. An axis-aligned broad-phase rejection now skips distance calculations when either coordinate already exceeds the interaction radius. The original `Math.hypot`, strength, accumulation order and clamping remain unchanged for possible neighbours. No fish limit, timing or visual behaviour changes.

## Measurement and verification
A deterministic 40-fish scene at 17 seconds now performs 352 distance calculations versus 1,560 before (77.4% fewer). This is an operation-count measurement, **not** an FPS or wall-clock speedup claim. Dense schools still need the full neighbour calculation. Tests compare exact output with the old implementation across normal, dense, radius-boundary, empty and reduced-motion fixtures. The operation-count test failed on the old code before implementation.

91 tests, TypeScript, lint and build pass. Ready-to-run distribution rebuilt. Actual laptop/TV frame rate, GPU load and 1GB video playback remain unmeasured.

## Large video review
The server already streams uploads through a size-limiting transform into a file and serves playback byte ranges from disk; it does not load the whole video into a JS buffer. Existing client preview uses object URLs, with revocation, rather than base64 conversion. No speculative codec, storage or buffering changes were made without a real-device bottleneck.

## Research
[MDN canvas optimization](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas) recommends avoiding repeated work in frame loops. The bounded rejection applies that principle without changing drawing resolution or image quality.

Next perspective: onboarding and first-run setup. Continue from the review branch; do not merge or deploy without approval.
