export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Camera {
  scale: number;
  x: number;
  y: number;
}

export const MIN_SCALE = 0.1;
export const MAX_SCALE = 8;
export const ZOOM_STEP = 1.15;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function screenToPlan(point: Point, camera: Camera): Point {
  return {
    x: (point.x - camera.x) / camera.scale,
    y: (point.y - camera.y) / camera.scale,
  };
}

export function planToScreen(point: Point, camera: Camera): Point {
  return {
    x: point.x * camera.scale + camera.x,
    y: point.y * camera.scale + camera.y,
  };
}

export function zoomAt(
  camera: Camera,
  anchor: Point,
  nextScale: number,
  bounds: { min: number; max: number } = { min: MIN_SCALE, max: MAX_SCALE },
): Camera {
  const scale = clamp(nextScale, bounds.min, bounds.max);
  const planPoint = screenToPlan(anchor, camera);
  return {
    scale,
    x: anchor.x - planPoint.x * scale,
    y: anchor.y - planPoint.y * scale,
  };
}

export function fitCamera(plan: Size, viewport: Size, padding = 24): Camera {
  if (plan.width <= 0 || plan.height <= 0) return { scale: 1, x: 0, y: 0 };
  const availW = Math.max(viewport.width - padding * 2, 1);
  const availH = Math.max(viewport.height - padding * 2, 1);
  const scale = clamp(Math.min(availW / plan.width, availH / plan.height), MIN_SCALE, MAX_SCALE);
  return {
    scale,
    x: (viewport.width - plan.width * scale) / 2,
    y: (viewport.height - plan.height * scale) / 2,
  };
}

export function snap(value: number, step: number): number {
  return step > 0 ? Math.round(value / step) * step : value;
}

export function visibleRect(camera: Camera, viewport: Size): Point & Size {
  const topLeft = screenToPlan({ x: 0, y: 0 }, camera);
  return {
    ...topLeft,
    width: viewport.width / camera.scale,
    height: viewport.height / camera.scale,
  };
}

export function centreOn(camera: Camera, viewport: Size, point: Point): Camera {
  return {
    scale: camera.scale,
    x: viewport.width / 2 - point.x * camera.scale,
    y: viewport.height / 2 - point.y * camera.scale,
  };
}
