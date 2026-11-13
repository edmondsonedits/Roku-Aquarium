# 4K layered aquarium prototype

## Goal and scope
Deliver a downloadable local aquarium with a bundled panoramic birthday scene, slow reversible camera, selected scenery occlusion, swimming saved fish and subtle optional effects. Preserve phone drawing, saved data, managed Windows updates and uploaded-video mode. This is a 2.5D prototype, not a reconstructed 3D tank.

## Approaches considered
- Pre-rendered video: easy playback, but cannot independently occlude player fish or vary depth/effects.
- Full 3D reconstruction: unavailable hidden surfaces, major modelling work and higher risk.
- Layered panorama (selected): reuses present renderer and image assets, supports controlled shallow depth with modest complexity.

## Plan
1. Inspect the three source images, order left/centre/right, align shared features and clean joins. Preserve the birthday lettering and original scene intent.
2. Produce 2160-high working assets where supported. Report actual dimensions and whether resampled or generated; do not equate enlargement with recovered original detail.
3. Use a bounded horizontal camera with eased acceleration, deceleration and endpoint pauses. Never expose image borders; reduced motion disables travel/effects.
4. Integrate fish and selected foreground scenery using one camera and consistent scene coordinates. Preserve artwork and existing save format.
5. Make built-in scene selectable while retaining video upload/restoration. Avoid overwriting any saved backdrop.
6. Cap render resolution and effects for weaker laptops; pause invisible rendering and clean up image/animation resources.
7. Add pure-math and UI contract tests. Run typecheck, lint, full tests and production build. Attempt browser rendering when environment permits.
8. Package on a separate review branch with ready-to-run assets, plan, limitations and instructions. Never merge or deploy automatically.

## Risks and mitigations
- Source images are overlapping generated continuations, not pixel-perfect tiles: inspect seams and do not promise invisible joins before visual verification.
- Parallax reveals surfaces not in source: keep movement shallow, use explicit limited occluders; do not simulate arbitrary camera rotation.
- Fine coral masks can look cut out: feather minimally and avoid sweeping large foreground offsets.
- Birthday text can mutate in generated images: verify lettering; retain source imagery when generation changes it.
- Large textures consume decoded GPU memory: compress delivery and bound render dimensions; download size is not runtime memory.
- Fish may clip or vanish behind scenery: keep foreground coverage small, depth stable and fish visibility sufficient.
- Camera motion discomfort: slow speed, stationary/reduced-motion option, short endpoint dwell.
- Browser/device testing unavailable here: report tests separately from physical TV/phone verification.
- Updates/data loss: no schema change, no data-folder changes, preserve original uploaded-video files.

## Acceptance
A user can download, run existing launcher, select the bundled scene without upload, see a reversible view and their existing fish, and return to video mode. Exactly which depth features are implemented and which remain provisional must be documented in the delivery.
