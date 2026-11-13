# Aquarium visual / TV and phone pass

Built on `improve/aquarium-tv-reliability` (5aabf6c). This pass keeps the aquarium calm and the fish central; it does not redesign the drawing tool or change storage/network access.

## Findings and changes

- Fullscreen QR was fixed at 144 CSS pixels with 11–14px supporting text. It now scales with the display, bounded for small and large screens, with a higher-resolution image and four-module quiet zone. Its room code has a screen-reader prefix.
- TV overlays now sit inside 5% safe margins. The small status line gains a dark backing so a bright uploaded video does not wash it out. On narrow fullscreen screens that secondary status is hidden to avoid collision with the QR.
- Display buttons now have 44px targets. Mobile host Backdrop controls sit above them rather than competing for the bottom edge. The entire expandable panel is constrained by the stage height and scrolls, so it cannot extend off the visible stage.
- Phone naming/search/network fields use 16px text and 44px height. Fish naming no longer depends on a tiny 12px field. No additional permanent drawing toolbar added.

## Sources and rationale

- [Android TV layout guidance](https://developer.android.com/training/tv/playback/compose/layouts): design for distance, readable text, overscan-safe edges. Applied as a useful TV display guideline, not a claim that this browser app is Android TV.
- [W3C target-size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum): touch targets and spacing matter; 44px is the enhanced target, beyond the 24px minimum.

## Verification

71 automated tests pass, TypeScript, ESLint and production build pass. The new SSR test verifies the QR's larger intrinsic square and accessible code label. Independent source review identified narrow-screen overlap and expanded-panel clipping; both were corrected.

No rendered-browser pass: cloud browser localhost returned `ERR_CONNECTION_REFUSED`; local headless Chromium could not start because socket creation is not permitted. A data-URL fixture was also denied by browser URL policy; no bypass attempted. These are source/layout improvements, not proven physical-TV or phone results.

Next real-device check: 320/390px phone host (Backdrop expanded), phone naming, 720p/1080p/4K TV fullscreen QR scan at normal viewing distance, dark and bright video backgrounds. In a later pass inspect drawing-tool discoverability and all small helper text without expanding chrome over the canvas.
