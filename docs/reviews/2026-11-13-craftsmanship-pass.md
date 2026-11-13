# Aquarium software craftsmanship pass

Built on the visual pass in `improve/aquarium-tv-reliability` (5061e91).

## Lens and finding

The experienced-maintainer lens is to strengthen a shared boundary, not add more features. Both room polling and action requests parsed responses independently. A LAN gateway/error page or empty response produced raw JSON syntax errors; a JSON `null` error body produced a property-access error. In an ambiguous save response, that gives people no warning that their action might already have succeeded.

## Bounded change

- One response reader now handles both reads and actions.
- Valid server error messages remain intact. Missing/malformed error bodies show the HTTP status and understandable aquarium/Wi-Fi guidance, never raw HTML.
- Unreadable action responses explicitly advise checking the aquarium before trying again, since the change might already be saved.
- No automatic mutation retries, mutation timeout, access changes or new persistence behavior. Existing read timeout and abort behavior remain.
- Successful JSON values are preserved rather than introducing an undocumented schema requirement.

Alternatives considered: separate catch blocks would duplicate error policy; broader schema validation across all endpoints is worthwhile but exceeds this bounded pass. Shared decoding is the smallest safe maintenance improvement.

## Research

[MDN Response.json](https://developer.mozilla.org/en-US/docs/Web/API/Response/json) distinguishes syntax errors from body transport/cancellation errors and notes JSON may produce null or primitives. This implementation handles syntax errors while preserving transport exception identity.

## Verification

Tests first reproduced three concrete failures: HTML error body, null error body, and an empty successful action response. Focused tests now cover those, known error envelope formats, valid response values, exactly one mutation request and abort identity. All 78 tests pass; TypeScript, ESLint, build and whitespace checks pass. An independent review found no blocking regressions and requested stalled-body coverage, which was added. Bundled distribution rebuilt.

This is an automated/source-verified reliability improvement, not a physical TV or phone playtest. No browser layout changes. Previous real-device checks remain outstanding.

Next perspective: game production. Prioritize the end-to-end coworker session and recoverable mistakes, rather than more visual polish before device verification.
