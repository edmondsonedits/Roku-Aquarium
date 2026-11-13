# Aquarium networking / LAN resilience pass

## Finding

A request can reach the aquarium laptop and save a change while its response is lost on the way back to a phone. The prior JSON response boundary correctly warned about malformed responses, but a socket loss before headers or during the body still exposed only `fetch failed` / `terminated`. That encourages an unsafe retry.

## Bounded improvement

POST transport interruptions now explicitly say the outcome is unconfirmed and ask the user to check the aquarium before retrying. The original exception remains available as the error cause. Valid application errors are unchanged, as are GET cancellation and timeout semantics. Body serialization is outside the network catch so invalid local input is not mislabeled as a connection failure.

No retry, timeout, optimistic save, access change or automatic mutation was added. A larger idempotency-key design could safely support retries, but needs endpoint-by-endpoint persistence work and is not part of this bounded pass.

## Research

- [MDN fetch](https://developer.mozilla.org/en-US/docs/Web/API/Window/fetch): network failures reject the request promise; HTTP failure status alone does not.
- [MDN Navigator.onLine](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/onLine): connectivity flags are unreliable. We continue using actual request outcomes, not an Internet status gate that could disable a working local aquarium.

## Verification

Two real local HTTP-server tests failed first with raw transport errors. They now verify helpful uncertain-save guidance and exactly one request both when the server closes before headers and when it truncates the response body. All 89 tests, TypeScript, lint, build and whitespace checks pass. Distribution rebuilt. Independent review found no blocking regressions.

This proves transport handling in automated tests, not actual Wi-Fi roaming or phone/TV behavior. Existing physical device checks remain outstanding.

Next perspective: performance, especially large backdrop video and many fish.
