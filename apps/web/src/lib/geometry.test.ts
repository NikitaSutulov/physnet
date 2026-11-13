import { describe, expect, it } from 'vitest';
import { fitCamera, MAX_SCALE, planToScreen, screenToPlan, snap, zoomAt } from './geometry';

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
});
