# Vault priorities: executable validation, not another replacement framework

## Browser smoke suite

Added `npm run test:browser`, a single sequential Playwright scenario using a host and two isolated coworker browser contexts. It covers creation, joining, drawing strokes, successful submission, offline submission and retry, reloading without duplicates, cancel/end/start shift, and returning saved fish to the water. Successful runs capture host and phone screenshots. Host failure traces are retained; the manually created coworker contexts do not inherit automatic failure tracing or screenshots.

Run on a development laptop with Node 24+:

```sh
npm ci
npx playwright install chromium
npm run test:browser
npx playwright show-report
```

The test uses a disposable data directory and a dedicated loopback server on port 4391. It refuses to reuse an existing server. It does not access the normal saved aquarium folder. A hard-killed run may leave a temporary `aquarium-e2e-*` directory; normal termination removes it.

A 390px viewport is a responsive-layout check, not physical touchscreen or workplace Wi-Fi validation. Screenshots still need human review. Real TV fullscreen, QR scanning and mobile browsers require equipment checks.

## Actual backdrop inspection

The original 1 GB video was not available in this workspace. Do not claim a codec defect or compression benefit without it. On the laptop with the video, inspect it without modifying it:

```sh
ffprobe -v error -show_entries format=format_name,duration,size,bit_rate:stream=index,codec_type,codec_name,width,height,pix_fmt,avg_frame_rate -of json "path/to/aquarium-video.mp4"
```

Record codec, resolution, frame rate and duration. Test the original at the intended TV resolution and compare visible loop seams, dropped frames and CPU/GPU load before deciding whether a separate optimized copy is worthwhile. Preserve the original; do not automatically transcode or upload it. Current streamed storage/range playback is already implemented.

## Fish behaviour

Goal-based roaming/grouping remains a candidate, not an implemented improvement. Current motion already varies speed/depth and separates fish. Defer changed swimming until visual comparison is possible; do not add a full AI engine merely because the vault contains one.

Sources: https://playwright.dev/docs/browser-contexts ; https://playwright.dev/docs/test-webserver ; https://ffmpeg.org/ffprobe.html ; https://github.com/Mugen87/yuka

## Verification in this environment

TypeScript and lint validation cover the new harness. Browser execution was attempted: the test server started, but Chromium exited before creating a page with `socket() failed: Operation not permitted`. A separate approved escalated Chromium launch failed the same way. The connected desktop is offline. Therefore no browser scenario or screenshots are claimed as passing; this suite must be exercised in a browser-capable environment before relying on it. No real user video was available.
