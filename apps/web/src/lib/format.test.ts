import { describe, expect, it } from 'vitest';
import { formatSpeed, timeAgo } from './format';

describe('format', () => {
  const now = Date.parse('2026-11-16T10:00:00Z');
  it('timeAgo', () => {
    expect(timeAgo(null, now)).toBe('—');
    expect(timeAgo('2026-11-16T09:59:55Z', now)).toBe('щойно');
    expect(timeAgo('2026-11-16T09:55:00Z', now)).toBe('5 хвилин тому');
  });
  it('formatSpeed', () => {
    expect(formatSpeed(null)).toBe('—');
    expect(formatSpeed(100)).toBe('100 Мбіт/с');
    expect(formatSpeed(10000)).toBe('10 Гбіт/с');
  });
});
