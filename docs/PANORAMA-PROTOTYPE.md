# Bundled panorama prototype

Run the usual `START-WINDOWS.bat`. The aquarium display now starts with the bundled panoramic scene; no background upload is required. Open **Scenery** on the host display to choose **Uploaded video**, pause motion, switch bubbles off, or choose **4K** render quality. Hide controls for TV viewing as usual.

Your existing fish library and uploaded video stay in the existing data directory. This feature changes no save schema, data location or Windows migration logic. Use the staged updater instructions in SIMPLE-WINDOWS-UPDATES.md.

## What this prototype does
- Gentle approximately 100-second left/right cycle, with eased acceleration and two-second stops.
- Birthday aquarium artwork with six selected solid foreground masks, so fish can swim behind scenery and return in front as their depth changes.
- Shared camera coordinates, sorted fish depth, subtle bubbles, pause, reduced-motion support and hidden-tab suspension.
- 1080p rendering by default; optional up-to-3840×2160 rendering on a suitable display. Canvas is limited by actual viewport and device pixel ratio.

## Honest limitations
The generated panorama is **2172×724**, composed from the three supplied overlapping images. An explicit higher-resolution generation retry returned the same dimensions. 4K mode upscales this artwork; it does not recover native 4K detail. The birthday wording is preserved in the generated scene.

This is one flattened image with approximate solid occlusion polygons, not a reconstructed 3D scene. Scenery does not yet have independently moving layers; coral silhouettes and hidden surfaces require a later art pass. The technique avoids exposing missing scenery while testing the camera/fish illusion. Native laptop/TV performance and visual polish need checking on the target device. Keep 1080p if 4K stutters.

Original video mode is retained, and no original fish or background file is deleted.
