# Roku Aquarium / The Work Aquarium

A standalone, laptop-run aquarium for your team. Draw fish on phones, watch them swim on a TV, and bring saved fish back on later shifts. No ChatGPT subscription, Sites hosting, paid service, or cloud account is needed to run it.

This is a laptop web app, not an installable Roku channel. Connect the laptop to the TV by HDMI, or use screen mirroring supported by your laptop and TV. HDMI is the most dependable option.

## Quick start

1. Install **Node.js 24 LTS or newer** from https://nodejs.org on the laptop. This is a one-time setup.
2. On this repository, choose **Code → Download ZIP**, then extract the whole folder. Do not run it inside the ZIP.
3. **Windows:** double-click `START-WINDOWS.bat`.
   **Mac/Linux:** open a terminal in the extracted folder and run `sh START-MAC-LINUX.command`.
4. Keep that terminal window open. Open **http://localhost:4317** in Chrome, Edge, Firefox, or Safari on the laptop.
5. Create an aquarium and **save the private recovery key** somewhere safe. The key restores host access if browser cookies are lost.
6. Connect the laptop to your TV. Use the host page's fullscreen button and hide the controls for a clean display.
7. In the phone-address selector, choose the laptop's Wi-Fi/LAN address. Phones must be on the **same network**. Scan the QR code, enter a display name, and draw.

The ready-to-run build is included in `runtime/` and `dist-local/`. You do **not** need to run `npm install` to use it. Internet is only needed for the initial download and Node installation. Once set up, the aquarium runs on your local network.

## Choose a fish body

The drawing editor includes simple and advanced fish bodies with visual previews. Choose a shape to colour in, or start with a blank canvas and invent your own. Changing shapes after adding artwork asks before replacing it, and Undo brings the previous drawing back.

## Save your fish for tomorrow

Submitted fish are saved on the laptop, not just in a phone browser. End the shift to clear the swimming display without deleting the library. Reopen it later, select saved fish, and apply the selection to welcome them back.

- Up to **40 fish swimming**, **500 saved per aquarium**, and **20 saved per participant**.
- Unfinished phone drawings are kept in that browser. Reload to continue; after reopening the drawing page, expand **Resume a saved draft on this device**. Editable drafts reopen as independent copies. A pending delivery retries the original fish without making duplicate saved fish.
- Browser draft storage can be cleared by private browsing or browser cleanup. Keep the same browser and network address while working. Submitted fish remain on the laptop.

## Your own background video

On the laptop's host screen, open **Backdrop** and choose your video. It is copied to the laptop's aquarium data folder and restored automatically next time. It is not uploaded to GitHub or the cloud.

- Up to **4 GB**. MP4 with H.264 video is the safest browser-compatible choice; WebM is also supported.
- A 1 GB video needs at least 1 GB free space **in addition to** any currently saved backdrop while replacement is in progress.
- Keep the page and server open until the save confirms. If the connection is interrupted, reload to check which backdrop was saved before retrying.
- Sound starts muted. Enable it if wanted and permitted at your workplace.
- Use video you have permission to display. No personal or commercial video is included in this repository.

## Where everything is saved

The server prints the exact data-folder path when it starts. By default:

- Windows: `%USERPROFILE%\.work-aquarium`
- Mac/Linux: `~/.work-aquarium`

This folder contains `aquarium.sqlite`, fish images under `objects/`, and videos under `backdrops/`. Keep it when replacing/upgrading the app folder. **To back up or move the aquarium, stop the server and copy the entire data folder**, including any SQLite companion files. Set `AQUARIUM_DATA_DIR` to use a different location. The recovery key restores access only; it does not replace a data backup.

Use one server process for a data folder. Close the server with Ctrl+C before copying its data or starting another instance. Keep the laptop awake and connected while the aquarium is in use.

## If phones cannot connect

- A QR address beginning with `localhost` only works on the laptop. Choose its `192.168…`, `10.…`, or `172.16–31.…` private network address instead.
- Use the same Wi-Fi network. Some workplace/guest Wi-Fi blocks communication between devices; ask your IT team about an approved local network. Cellular data alone cannot reach the laptop.
- Your operating system may ask whether Node can accept incoming connections. Only allow it on the trusted private network you intend to use, if workplace policy permits.
- Do not forward this app's port on your router or expose it to the public internet. This version is intended for a trusted local network and uses local HTTP, not encrypted public hosting.
- If the laptop's address changes, choose the new address and scan the new QR code. A browser at a different address may require the aquarium recovery key.
- A blank video can mean an unsupported codec. Try H.264 MP4. Performance depends on the laptop, browser, TV resolution, and video encoding.

## For developers

Source is included. With Node 24+:

```sh
npm ci
npm test
npm run typecheck
npm run lint
npm run build
npm start
```

`npm run build` creates the local browser bundle and dependency-free Node server. `npm start` serves the included build at port 4317; use `npm start -- --port 5000` for another port. No hosted build or deployment is required.

The implementation reuses the fish editor and swimming components from the callback-game work, with a standalone Node/SQLite/filesystem backend. Third-party dependency notices are in `THIRD-PARTY-NOTICES.md`.

## Verification and limitations

The release is checked with automated tests for durable fish storage, restart recovery, duplicate-delivery handling, room permissions, draft recovery, capacity limits, image validation, video streaming/range requests, failed and concurrent video replacements, and local-network host validation, plus TypeScript, lint, and production build checks.

Physical phone-to-laptop Wi-Fi, TV mirroring, and 1 GB browser video playback must be verified on your actual equipment. A browser video-upload test in the build environment was not completed. The local streaming API is tested with synthetic data; no personal media was used or published.
