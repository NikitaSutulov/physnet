const relative = new Intl.RelativeTimeFormat('uk', { numeric: 'auto' });

/** "5 хвилин тому", "щойно", … */
export function timeAgo(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return '—';
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 10) return 'щойно';
  if (abs < 60) return relative.format(seconds, 'second');
  if (abs < 3600) return relative.format(Math.round(seconds / 60), 'minute');
  if (abs < 86_400) return relative.format(Math.round(seconds / 3600), 'hour');
  return relative.format(Math.round(seconds / 86_400), 'day');
}

export function formatSpeed(mbps: number | null): string {
  if (!mbps) return '—';
  return mbps >= 1000 ? `${mbps / 1000} Гбіт/с` : `${mbps} Мбіт/с`;
}

export const DEVICE_TYPE_LABELS: Record<string, string> = {
  SWITCH: 'Комутатор',
  ROUTER: 'Маршрутизатор',
  HOST: 'Хост',
  ACCESS_POINT: 'Точка доступу',
  OTHER: 'Інше',
};
