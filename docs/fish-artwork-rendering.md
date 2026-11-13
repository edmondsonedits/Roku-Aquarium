# Artwork-first fish rendering

The user screenshot showed a stair-stepped silhouette and a striped/hollow turning fish. The alpha-occupied 64×48 mesh quantized outlines; its sidewall UVs and alpha-discard faces did not form a visually continuous surface. Watertight index topology tests did not establish visual quality.

This review replaces that extrusion in the renderer with one continuous shared-vertex artwork sheet. Texture alpha defines outlines and intentional holes at texture resolution. No sidewalls invent colors or expose gaps. The texture is drawn on either facing direction, with gentle tail bending and nearly unchanged color. Panorama heading is eased toward broadside so drawings remain readable for most of their depth travel. Near/far size, paths and coral occlusion remain intact. Canvas fallback uses the same tail-bend strength and turn-width floor.

This is deliberately **2.5D artwork**, not a fully sculpted fish viewed head-on. Original PNGs, storage and saves are unchanged. The old volume utility remains unused for compatibility/reference, not in the rendering path.

References: MDN WebGL best practices, https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices ; WebGL specification alpha/compositing, https://registry.khronos.org/webgl/specs/latest/1.0/ .

Verification: continuous UV/area coverage regression, panorama readability regression, full suite, lint, typecheck and build. Browser visual confirmation must be recorded separately; unit tests do not establish appearance or frame rate. Cloud Chromium cannot launch (socket EPERM); do not claim successful GPU verification from these tests.
