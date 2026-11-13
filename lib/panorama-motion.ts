/** Presentation-only camera. Smooth zero-speed endpoints with a real two-second dwell. */
export function panoramaCamera(seconds: number, reduced = false): number {
  if (reduced) return .5;
  const travel = 48, dwell = 2, half = travel + dwell;
  const phase = ((Math.max(0, seconds) % (half * 2)) + half * 2) % (half * 2);
  const reverse = phase >= half;
  const t = Math.min(1, (phase % half) / travel);
  const ease = t * t * t * (t * (t * 6 - 15) + 10);
  return reverse ? 1 - ease : ease;
}
export function panoramaLayout(imageWidth: number, imageHeight: number, viewportWidth: number, viewportHeight: number, progress: number) {
  const scale = Math.max(viewportHeight / Math.max(1, imageHeight), viewportWidth / Math.max(1, imageWidth));
  const width = imageWidth * scale, height = imageHeight * scale;
  return { width, height, x: -(width - viewportWidth) * Math.max(0, Math.min(1, progress)), y: (viewportHeight - height) / 2 };
}
export const PANORAMA_OCCLUSION_DEPTH = .58;

/** Budget expensive draws to 60 per second, independent of monitor refresh rate.
 * Absolute time slots avoid cumulative drift (and a 144 Hz monitor dropping to 48 fps).
 * Simulation time must still use actual elapsed time between draws.
 */
export function panoramaFrameDue(now: number, lastDraw: number | null): boolean {
  return lastDraw === null || Math.floor(now * .06 + 1e-7) > Math.floor(lastDraw * .06 + 1e-7);
}
