# Persistence and data stewardship pass

## Finding and bounded change
An older app copy silently accepted a database whose migration version was newer than its bundled migrations. This could let old code operate on an incompatible schema. Negative versions instead produced a cryptic path error. Startup now refuses both unsupported versions before WAL setup or migrations, closes the connection, and asks the host to keep the data folder and use a compatible app copy. No data is deleted, reset or downgraded.

SQLite leaves `user_version` interpretation to the application ([SQLite PRAGMA documentation](https://www.sqlite.org/pragma.html#pragma_user_version)); therefore compatibility must be checked here. Existing normal restart, transaction rollback and video atomic-swap behavior are retained. Backup instructions already require stopping the server and copying the complete data folder, including SQLite companions; no speculative backup mechanism was added.

## Verification
Two new regression tests failed before the guard and passed afterward. They verify the database remains byte-for-byte unchanged and saved sentinel data survives refusal. Existing tests cover fish rows/images across independent restart and streamed backdrop replacement. All 96 tests, TypeScript, lint, build and whitespace checks pass. Independent review found no blockers. Ready-to-run server rebuilt.

This is a synthetic-database test, not a power-loss test or verification of Danny's actual saved fish and 1GB video. No existing personal data was used. No merge, deployment or security-setting changes.

Next perspective: drawing-tool ergonomics / artist workflow, with actual browser verification if available.
