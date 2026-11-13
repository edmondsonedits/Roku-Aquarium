export type PaintTool = 'pen' | 'eraser' | 'spray';
export type PaintSettings = Record<PaintTool, {size: number; opacity: number}>;
export const DEFAULT_PAINT_SETTINGS: PaintSettings = {
  pen: {size: 14, opacity: 1},
  eraser: {size: 14, opacity: 1},
  spray: {size: 144, opacity: .5},
};
export function changePaintSetting(settings: PaintSettings, tool: PaintTool, change: Partial<PaintSettings[PaintTool]>): PaintSettings {
  return {...settings, [tool]: {...settings[tool], ...change}};
}
