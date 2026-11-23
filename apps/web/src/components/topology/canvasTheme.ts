export const CANVAS_COLORS = {
  accent: '#0e7490',
  text: '#0f172a',
  label: 'rgba(255, 255, 255, 0.9)',
  active: '#15803d',
  offline: '#c2410c',
  linkActive: '#0e7490',
  linkDown: '#c2410c',
  device: {
    SWITCH: '#0e7490',
    ROUTER: '#7c3aed',
    HOST: '#334155',
    ACCESS_POINT: '#0891b2',
    OTHER: '#64748b',
  } as Record<string, string>,
} as const;
