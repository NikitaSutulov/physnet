'use client';

import { useRealtimeStore, type RealtimeStatus } from '@/store/realtimeStore';

const LABELS: Record<RealtimeStatus, string> = {
  online: 'Наживо',
  connecting: 'Підключення…',
  offline: 'Офлайн',
};

const DOT: Record<RealtimeStatus, string> = {
  online: 'bg-success',
  connecting: 'bg-amber-500 animate-pulse',
  offline: 'bg-muted',
};

export function RealtimeIndicator() {
  const status = useRealtimeStore((s) => s.status);
  return (
    <span
      className="flex items-center gap-1.5 text-xs text-muted"
      title={
        status === 'online'
          ? 'Зміни інших користувачів і контролера ONOS з’являються одразу'
          : 'Немає з’єднання в реальному часі; дані оновлюються періодично'
      }
    >
      <span className={`size-2 rounded-full ${DOT[status]}`} aria-hidden />
      {LABELS[status]}
    </span>
  );
}
