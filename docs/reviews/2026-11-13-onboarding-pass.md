# Onboarding pass: guidance at the point of use

## Findings and bounded design
The README explains laptop hosting, TV projection and same-network phone participation, but the entry screens did not make those roles explicit. A newcomer could create another aquarium on a phone instead of joining the existing one. The host had scattered technical notes but no concise setup sequence.

Added clear laptop-versus-phone guidance before creation, code-location and same-network help beside the join field (associated through aria-describedby), and a collapsed native details checklist on the host page. The checklist explains laptop/server uptime, HDMI/mirroring/fullscreen, phone joining, and optional video persistence. It is outside the TV stage, adds no mandatory onboarding gates, and changes no room, network or storage behavior. Existing returning users can ignore it.

Considered an automatic tutorial or setup wizard, but those would interrupt repeat shifts and add unnecessary state. Contextual, optional guidance fits this small local app better.

## Research
- [NN/g: Onboarding Tutorials vs. Contextual Help](https://www.nngroup.com/articles/onboarding-tutorials/): instructions are more useful alongside the relevant activity than in a detached tutorial.
- [W3C: Form Instructions](https://www.w3.org/WAI/tutorials/forms/instructions/): give clear instructions and associate field-specific help with its control.

## Verification
Three added SSR tests failed before implementation and pass afterward. All 94 tests, TypeScript, lint, build and whitespace checks pass. Ready-to-run distribution rebuilt. SSR verifies content and semantic markup, not browser layout, native details interaction or real phone/TV usability. Those still need physical-device testing. No deployment or merge.

Next perspective: persistence/data stewardship, including restart, backup and restoration affordances. Preserve the current review branch.
