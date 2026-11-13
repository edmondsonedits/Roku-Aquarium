# Drawing-tool ergonomics pass

## Finding and decision
Brush and eraser previously shared size and opacity state. A broad cleanup eraser could unexpectedly turn the fine brush into a broad, faint brush when switching back. Keep each paint tool's session settings independently, without changing defaults, saved artwork, rendering or history semantics. The settings panel now labels Eraser size/opacity correctly.

Alternatives considered: global settings (least state, but surprising switches); persistent per-device presets (more storage/migration surface); in-session per-tool settings (chosen: bounded and predictable).

## Research
Procreate's official handbook describes size/opacity control across paint and erase tools and saved settings: https://help.procreate.com/procreate/handbook/5.4/brushes/paint-smudge-erase . This supports reducing repeated adjustments; no claim of exact product parity.

## Verification
98 tests pass, including independent eraser changes, retained tool choices, and unchanged defaults. TypeScript, lint, production build and whitespace checks pass. No real touchscreen or browser interaction was tested in this pass; follow up with fine brush → wide eraser → brush, and translucent eraser → opaque brush on a phone.

No merge, deployment, data deletion or security changes. Next perspective: end-to-end QA and release readiness, especially closing accumulated browser/device verification gaps.
