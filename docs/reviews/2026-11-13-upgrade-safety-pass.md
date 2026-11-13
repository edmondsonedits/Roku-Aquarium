# Upgrade safety pass, 2026-11-13

Perspective: reliability engineering and data preservation.

Reviewed the staged Windows installer at 068a283. Its runtime data remains separate from the managed application; no migration of the large video is needed. The pass adds regression tests rather than changing runtime behavior:

- Injected an interruption after staging, checked old application and exact saved image bytes remained intact, then retried successfully.
- Inserted an unexpected personal drawing into the previous application directory and confirmed successful-start cleanup refuses to remove that directory or the drawing.

Research: Node.js documents that copyFile has no atomicity guarantee (https://nodejs.org/api/fs.html#fspromisescopyfilesrc-dest-mode), supporting verification of staged files before activating the package. These tests check recoverable exceptions, not physical power-loss durability.

Validation: 113 tests pass; typecheck, lint, build and diff whitespace checks pass. No actual Windows BAT execution or hardware power-loss test. No user data touched, merge, deployment, access or security change.

Next useful perspective: mobile orientation and interruption recovery, particularly the new full-screen editor.
