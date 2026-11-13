# Aquarium game-production pass

## Session lens

Review the full coworker session: host opens a saved aquarium, coworkers join and draw, fish arrive, host curates the TV, and the shift ends. Existing draft recovery, saved fish and network guidance cover much of this flow. One avoidable interruption remained: a single accidental **End shift** click immediately removes every swimming fish and prevents new submissions. Restarting does not restore the previous active selection automatically.

## Bounded design

Use the browser's native confirmation only for **End shift**. Explain that submissions stop, swimming fish leave the display, and all saved fish remain. Cancel must make no network request. Starting a shift remains one click, with clearer feedback that the host must select saved fish to welcome them back. Native confirmation avoids adding modal focus management to a small patch and works without a new dependency.

Considered: automatic undo would require snapshot/concurrency semantics and could overwrite other host choices; a custom dialog adds UI complexity. Both are outside this targeted pass. No confirmation is added to routine fish selection. No persistence, authorization, deletion or security behavior changes.

## Research

[Nielsen Norman Group: Confirmation Dialogs Can Prevent User Errors](https://www.nngroup.com/articles/confirmation-dialog/) recommends describing specific consequences and reserving confirmations for consequential actions, rather than routine steps. Applied here to the shared-session interruption, not because ending a shift deletes fish.

## Verification plan

Unit tests cover cancellation with no action, confirmed end ordering and one request, direct start without a prompt, and propagation of a failed action without retry. Run the complete test suite, typecheck, lint and build. Actual browser-native confirmation and a phone/TV session remain device-test items; source/unit checks do not prove physical-device behavior.

## Next lens

Accessibility: keyboard and screen-reader usability of the drawing tools and host fish selection, plus reduced-motion behavior. Avoid broad visual expansion before device validation.

## Results

All 82 tests pass, along with TypeScript, ESLint, production build and whitespace checks. The four new tests first reproduced the missing cancellation/confirmation gate, then passed with the change. Independent review found no blocking regressions. The ready-to-run distribution was rebuilt. No browser-native dialog or real phone/TV session was tested in this pass; earlier preview limitations remain. No merge or deployment.
