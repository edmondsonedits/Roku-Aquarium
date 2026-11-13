# Aquarium accessibility pass

## Lens and findings

Focus on keyboard, screen-reader and speech-input navigation of the phone fish editor. Existing fish selection buttons already expose pressed state; the editor already has native button controls, labelled sliders, live save feedback and a reduced-motion preview. Preserve those rather than duplicate them.

Two gaps addressed: the 28 palette swatches were named only with hexadecimal codes, and closing a temporary body/settings panel could leave keyboard focus on the document after its focused control disappeared. The visible Draw, Fish bodies and Done labels also did not consistently appear in their accessible names.

## Bounded changes

- Name all existing swatches in familiar words while retaining exact colour codes and their existing selection state; expose the same name in a mouse tooltip. No palette colour or order changes.
- Move focus into the body or tool-settings panel when it opens. On dismissal, return focus to its opener only if focus is still inside that panel or has fallen back to the document body. Do not steal focus when the user has moved elsewhere, and do not target disabled/disconnected openers. These are non-modal panels, so no focus trap.
- Align the three button accessible names with their visible labels for speech-input users.

A full keyboard painting mode would require a separate interaction design and is not claimed here. This patch does not make the whole canvas drawing experience nonvisual or WCAG-conformant.

## Research

- [W3C Label in Name](https://www.w3.org/WAI/WCAG22/Understanding/label-in-name.html): visible labels should be part of accessible names, supporting speech activation.
- [W3C Button Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/button/): named native buttons, pressed state and context-appropriate focus placement.
- [W3C Disclosure Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/): keep disclosure state on the existing body-picker trigger. Focus entry is a deliberate usability choice for these overlay-like panels, not a claim that all disclosures require moving focus.

## Verification

87 automated tests pass, along with TypeScript, ESLint, build and whitespace checks. New helper tests cover all named swatches, case-normalized codes, unknown-colour fallback, focus entry/return, not stealing focus moved elsewhere, and disabled/disconnected openers. The ready-to-run distribution was rebuilt. Independent read-only review found no blocking regression and suggested the Done label correction, which was applied.

These tests do not mount React or prove focus timing on real browsers. Browser tooling was not available in this worker. Keyboard Tab/Shift+Tab/Escape/Done flows, speech activation and VoiceOver/TalkBack announcements still need real-device validation, alongside the outstanding laptop/TV/1GB-video checks. No merge, deployment, access or security settings changed.

## Next perspective

Networking: inspect recoverable reconnect, stale-state messaging and local Wi-Fi edge cases without changing the security model. Avoid adding retries to uncertain writes.
