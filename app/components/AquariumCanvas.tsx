"use client";

import { useEffect, useRef } from "react";
import type { AquariumFish } from "../../lib/aquarium-contracts";
import type { FishFinalePublicEntry } from "../../lib/arcade/fish-finale";
import { clamp, fishSeed, sampleSwim, separateFish, swimPersonality, type FishPose } from "../../lib/fish-motion";
import { FishMesh, fishSize } from "./fish/FishMesh";

type Asset = { source: string; image: HTMLImageElement; entry: FishFinalePublicEntry; ready: boolean; failedAt: number; timer?: ReturnType<typeof setTimeout> };
const entryFor = (fish: AquariumFish): FishFinalePublicEntry => ({
  id: fish.id, label: fish.name, practice: false, appearanceSeed: fishSeed(fish.id),
  width: 1024, height: 768, bounds: fish.bounds,
  anchors: { head: { x: 820 / 1024, y: .5 }, body: { x: 548 / 1024, y: .5 }, tail: { x: 164 / 1024, y: .5 } },
});

function drawSprite(ctx: CanvasRenderingContext2D, image: HTMLImageElement, entry: FishFinalePublicEntry, pose: FishPose, width: number, height: number) {
  const size = fishSize(entry, pose, width, height);
  ctx.save(); ctx.translate(pose.x * width, pose.y * height); ctx.rotate(pose.pitch * pose.facing); ctx.scale(pose.facing * Math.max(.035, pose.yaw), 1); ctx.globalAlpha = pose.opacity;
  const left = -(entry.bounds.x + entry.bounds.width / 2) * size.width, top = -(entry.bounds.y + entry.bounds.height / 2) * size.height;
  if (pose.amplitude === 0) ctx.drawImage(image, left, top, size.width, size.height);
  else {
    // Fallback edges meet continuously: each strip shears from the same sampled
    // displacement as its neighbour. Screen-space overlap also covers raster
    // antialiasing during yaw, avoiding transparent hairlines through the body.
    const strips = width < 700 ? 14 : 24, sourceWidth = image.naturalWidth, sourceHeight = image.naturalHeight;
    const wave = (u: number) => { const along = clamp((u - entry.anchors.tail.x) / Math.max(.1, entry.anchors.head.x - entry.anchors.tail.x)); return Math.sin(pose.tailPhase + along * 5.2) * Math.pow(1 - along, 1.4) * size.width * pose.amplitude; };
    for (let i = 0; i < strips; i++) {
      const u = i / strips, next = (i + 1) / strips, dy = wave(u), end = wave(next);
      const overlap = sourceWidth / Math.max(1, size.width * Math.max(.035, pose.yaw)) * .85;
      const sourceStart = Math.max(0, u * sourceWidth - overlap), sourceEnd = Math.min(sourceWidth, next * sourceWidth + overlap);
      const padding = (u * sourceWidth - sourceStart) / sourceWidth * size.width;
      ctx.save(); ctx.translate(left + u * size.width, dy); ctx.transform(1, (end - dy) / (size.width / strips), 0, 1, 0, 0);
      ctx.drawImage(image, sourceStart, 0, sourceEnd - sourceStart, sourceHeight, -padding, top, (sourceEnd - sourceStart) / sourceWidth * size.width, size.height); ctx.restore();
    }
  }
  ctx.restore();
}

/** Transparent presentation only. Polling updates the assets, never the animation clock. */
export function AquariumCanvas({ fish, reducedMotion }: { fish: AquariumFish[]; reducedMotion?: boolean }) {
  const surface = useRef<HTMLDivElement>(null);
  const webgl = useRef<HTMLCanvasElement>(null);
  const fallback = useRef<HTMLCanvasElement>(null);
  const update = useRef<((fish: AquariumFish[], reduced?: boolean) => void) | null>(null);

  useEffect(() => {
    const container = surface.current, glCanvas = webgl.current, canvas = fallback.current;
    if (!container || !glCanvas || !canvas) return;
    const context = canvas.getContext("2d", { alpha: true });
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const assets = new Map<string, Asset>();
    let mesh: FishMesh | null = null;
    let current: AquariumFish[] = [], reducedOverride: boolean | undefined;
    let disposed = false, frame = 0, last = 0, elapsed = 0, dirty = true;
    let width = 1, height = 1;
    const activateFallback = () => {
      mesh?.dispose(); mesh = null;
      glCanvas.style.visibility = "hidden"; canvas.style.visibility = "visible";
      container.dataset.renderer = "canvas"; dirty = true;
    };
    const initializeMesh = () => {
      mesh?.dispose(); mesh = null;
      try {
        mesh = new FishMesh(glCanvas);
        for (const [id, asset] of assets) if (asset.ready) mesh.texture(id, asset.image, asset.entry);
        glCanvas.style.visibility = "visible"; canvas.style.visibility = "hidden";
        container.dataset.renderer = "webgl"; dirty = true;
      } catch { activateFallback(); }
    };
    const remove = (id: string, asset: Asset) => {
      clearTimeout(asset.timer); asset.image.onload = null; asset.image.onerror = null;
      if (!asset.image.complete) asset.image.src = "";
      mesh?.remove(id); assets.delete(id);
    };
    const reconcile = (next: AquariumFish[], reduced?: boolean) => {
      current = next.filter(item => item.active).slice(0, 40);
      reducedOverride = reduced;
      const ids = new Set(current.map(item => item.id));
      for (const [id, asset] of assets) if (!ids.has(id)) remove(id, asset);
      for (const item of current) {
        const previous = assets.get(item.id);
        if (previous?.source === item.imageUrl && (!previous.failedAt || Date.now() - previous.failedAt < 30_000)) continue;
        if (previous) remove(item.id, previous);
        const image = new Image(); image.decoding = "async";
        const asset: Asset = { source: item.imageUrl, image, entry: entryFor(item), ready: false, failedAt: 0 };
        assets.set(item.id, asset);
        const failure = () => {
          if (disposed || assets.get(item.id) !== asset) return;
          clearTimeout(asset.timer); image.onload = null; image.onerror = null;
          asset.failedAt = Date.now(); dirty = true;
        };
        image.onerror = failure;
        image.onload = () => {
          if (disposed || assets.get(item.id) !== asset) return;
          clearTimeout(asset.timer);
          if (!image.naturalWidth || !image.naturalHeight) { failure(); return; }
          asset.ready = true; image.onload = null; image.onerror = null;
          try { mesh?.texture(item.id, image, asset.entry); } catch { activateFallback(); }
          dirty = true;
        };
        asset.timer = setTimeout(failure, 15_000);
        image.src = item.imageUrl;
      }
      dirty = true;
      requestFrame();
    };
    const resize = () => {
      const rect = container.getBoundingClientRect();
      width = Math.max(1, rect.width); height = Math.max(1, rect.height);
      const scale = Math.min(window.devicePixelRatio || 1, 1.5, 1920 / width, 1080 / height);
      for (const target of [canvas, glCanvas]) {
        target.width = Math.max(1, Math.floor(width * scale));
        target.height = Math.max(1, Math.floor(height * scale));
      }
      dirty = true; requestFrame();
    };
    const render = (now: number) => {
      frame = 0;
      if (disposed || document.hidden) { last = 0; return; }
      const reduced = reducedOverride ?? motion.matches;
      if (last && !reduced) elapsed += Math.min(.1, (now - last) / 1000);
      last = now;
      if (!reduced || dirty) {
        dirty = false;
        const ready = current.map(item => assets.get(item.id)).filter((asset): asset is Asset => Boolean(asset?.ready));
        const poses = separateFish(ready.map(asset => sampleSwim(swimPersonality(asset.entry.appearanceSeed), elapsed * .65, reduced)));
        const ordered = ready.map((asset, i) => ({ asset, pose: { ...poses[i]!, amplitude: poses[i]!.amplitude * .65, scale: poses[i]!.scale * .72 } })).sort((a, b) => a.pose.depth - b.pose.depth);
        if (mesh) {
          try { mesh.begin(width, height, ordered.length); for (const { asset, pose } of ordered) mesh.draw(asset.entry, pose, width, height); }
          catch { activateFallback(); }
        }
        if (!mesh && context) {
          context.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
          context.clearRect(0, 0, width, height);
          for (const { asset, pose } of ordered) drawSprite(context, asset.image, asset.entry, pose, width, height);
        }
      }
      if (!reduced && current.length) requestFrame();
    };
    function requestFrame() { if (!frame && !disposed && !document.hidden) frame = requestAnimationFrame(render); }
    const visibility = () => { cancelAnimationFrame(frame); frame = 0; last = 0; dirty = true; requestFrame(); };
    const motionChange = () => { dirty = true; last = 0; requestFrame(); };
    const lost = (event: Event) => { event.preventDefault(); activateFallback(); requestFrame(); };
    const restored = () => { if (!disposed) { initializeMesh(); requestFrame(); } };
    glCanvas.addEventListener("webglcontextlost", lost);
    glCanvas.addEventListener("webglcontextrestored", restored);
    document.addEventListener("visibilitychange", visibility);
    motion.addEventListener("change", motionChange);
    window.addEventListener("resize", resize);
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
    observer?.observe(container);
    initializeMesh(); resize(); update.current = reconcile;
    return () => {
      disposed = true; update.current = null; cancelAnimationFrame(frame); observer?.disconnect();
      document.removeEventListener("visibilitychange", visibility); motion.removeEventListener("change", motionChange);
      window.removeEventListener("resize", resize);
      glCanvas.removeEventListener("webglcontextlost", lost); glCanvas.removeEventListener("webglcontextrestored", restored);
      for (const [id, asset] of assets) remove(id, asset);
      mesh?.dispose();
    };
  }, []);
  useEffect(() => { update.current?.(fish, reducedMotion); }, [fish, reducedMotion]);

  const fill = { position: "absolute" as const, inset: 0, width: "100%", height: "100%", pointerEvents: "none" as const };
  return <div ref={surface} aria-hidden="true" style={{ ...fill, overflow: "hidden" }}>
    <canvas ref={webgl} style={fill} />
    <canvas ref={fallback} style={{ ...fill, visibility: "hidden" }} />
  </div>;
}

export default AquariumCanvas;
