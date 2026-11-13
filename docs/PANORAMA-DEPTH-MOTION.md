# Layered motion and fish update

## Diagnosis
The previous panorama deliberately stopped both camera and fish whenever the browser reported `prefers-reduced-motion: reduce`. The only explanation was inside a collapsed drawer. The eye/slash button controls the HUD, not motion. Actual Windows reduced-motion state was not inspected, so it is a source-backed explanation, not a confirmed diagnosis of that machine.

The original 48-second eased camera also moved less than a pixel in its first second. The scene now starts mid-traverse while retaining smooth two-second endpoint dwells.

## Changes
- Visible still/paused message and Play aquarium button. System motion preference remains respected by default; Animate this aquarium is a local, session-only opt-in and never changes Windows settings.
- Existing drawing-textured double-shell WebGL fish are now composited into the panorama, not only the uploaded-video mode. One offscreen context serves all fish. Context failure falls back to the original 2D drawing renderer.
- Coherent depth/heading motion makes approaching fish larger and receding fish smaller. Fish are more prominent; artwork is unchanged.
- Rear fish render before source-locked coral masks, nearer fish after them. Separate procedural foreground fronds have stronger parallax and gentle sway. Bubbles remain optional.
- 60fps draw ceiling, hidden-page suspension, bounded canvas size, active fish cap and unchanged save formats.

## Honest limits
The source panorama remains a 2172×724 flattened image displayed/upscaled, not native 4K or a fully reconstructed reef. Six conservative coral masks approximate occlusion. Added fronds are procedural, not extracted coral. Fish have two curved textured shells, not species-specific sculpted models. Canvas fallback is flat. High-DPI and real Windows GPU performance still need device validation.

## Verification
Typecheck, lint, production build and 122 automated tests passed in the cloud. Independent source review found no must-fix clock/compositing/save regression. Cloud Chromium launch had a socket permission failure; pixel-level/browser proof is separately reported if a supported route succeeds. No user PC, save data, access settings or deployments were changed.

## References
- https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40media/prefers-reduced-motion
- https://registry.khronos.org/webgl/specs/latest/1.0/ (same-task drawImage compositing, drawing buffer lifetime)
