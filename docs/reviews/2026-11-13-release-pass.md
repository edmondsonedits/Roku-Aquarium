# Release readiness pass

Perspective: first-run packaging and Windows readiness.

The ZIP contains the built server and web UI, but starting with an incomplete extraction previously created/opened the saved-data database and only later returned an HTTP 503 for the missing UI. The server now checks for its web entry point before opening storage and explains how to extract the complete package or rebuild. No automatic installs, repairs, security changes or user-data modifications were added.

Regression test uses disposable real directories and verifies both rejection and absence of a newly created data folder. This is a missing-entry check, not a guarantee that every asset is intact.

Verification: 103 tests pass; TypeScript, lint, build and whitespace checks pass. Windows launcher execution, browser assertions and physical TV/phone checks remain outstanding. npm emitted existing environment proxy-configuration warnings.

Research: npm engines is advisory rather than a guarantee of executable readiness: https://docs.npmjs.com/cli/v11/configuring-npm/package-json/#engines . Existing explicit Node 24 launch guards were retained.

Base: vault-browser-validation, preserving its isolated Playwright suite. Next perspective: holistic review of accumulated changes and prioritization, rather than additional unvalidated UI features.
