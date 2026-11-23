import { describe, expect, it } from 'vitest';
import {
  MAX_SCALE,
  centreOn,
  fitCamera,
  planToScreen,
  screenToPlan,
  snap,
  visibleRect,
  zoomAt,
} from './geometry';

describe('geometry', () => {
  const camera = { scale: 2, x: 100, y: 50 };

  it('screen <-> plan conversions are inverse', () => {
    const p = { x: 37, y: -12 };
    expect(screenToPlan(planToScreen(p, camera), camera)).toEqual(p);
  });

  it('zoomAt keeps the anchor point fixed', () => {
    const anchor = { x: 400, y: 300 };
    const before = screenToPlan(anchor, camera);
    const next = zoomAt(camera, anchor, 3.5);
    expect(next.scale).toBe(3.5);
    const after = screenToPlan(anchor, next);
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
  });

  it('zoomAt clamps the scale', () => {
    expect(zoomAt(camera, { x: 0, y: 0 }, 1000).scale).toBe(MAX_SCALE);
  });

  it('fitCamera fits and centres the plan', () => {
    const cam = fitCamera({ width: 2000, height: 1000 }, { width: 1048, height: 800 }, 24);
    expect(cam.scale).toBeCloseTo(0.5);
    // horizontally the plan exactly fills the padded width
    expect(cam.x).toBeCloseTo(24);
    // vertically centred
    expect(cam.y).toBeCloseTo((800 - 500) / 2);
  });

  it('snap rounds to the grid', () => {
    expect(snap(37, 25)).toBe(25);
    expect(snap(38, 25)).toBe(50);
    expect(snap(38, 0)).toBe(38);
  });

  it('reports the visible part of the plan', () => {
    const camera = { scale: 2, x: -100, y: -50 };
    expect(visibleRect(camera, { width: 800, height: 600 })).toEqual({
      x: 50,
      y: 25,
      width: 400,
      height: 300,
    });
  });

  it('centres the view on a plan point', () => {
    const viewport = { width: 800, height: 600 };
    const camera = centreOn({ scale: 2, x: 0, y: 0 }, viewport, { x: 100, y: 100 });
    expect(camera).toEqual({ scale: 2, x: 200, y: 100 });
    const r = visibleRect(camera, viewport);
    expect(r.x + r.width / 2).toBe(100);
    expect(r.y + r.height / 2).toBe(100);
  });
});
