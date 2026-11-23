'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import type { DashboardStats, SystemEvent, SystemEventSeverity } from '@physnet/shared';
import { useDashboardStats, useEventFeed } from '@/hooks/useDashboard';
import { useBuildings } from '@/hooks/useFloorPlans';
import { useNow } from '@/hooks/useNow';
import { EVENT_TYPE_LABELS, timeAgo } from '@/lib/format';
import { errorMessage } from '@/services/api';

export function DashboardView() {
  const { data: stats, error } = useDashboardStats();

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Дашборд</h1>
        <p className="mt-1 text-sm text-muted">Стан мережі, будівлі та останні події</p>
      </div>

      {error && (
        <p role="alert" className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
          {errorMessage(error, 'Не вдалося завантажити статистику')}
        </p>
      )}
      <StatCards stats={stats} />

      <div className="grid gap-6 lg:grid-cols-[1fr_24rem]">
        <BuildingsCard />
        <EventFeed />
      </div>
    </section>
  );
}

function StatCards({ stats }: { stats: DashboardStats | undefined }) {
  const c = stats?.controller;
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <Stat
        label="Пристрої"
        value={stats?.devices.total}
        hint={
          stats && `${stats.devices.byType.SWITCH} комут. · ${stats.devices.byType.HOST} хостів`
        }
      />
      <Stat
        label="Недоступні"
        value={stats?.devices.offline}
        tone={stats?.devices.offline ? 'danger' : 'default'}
        hint={stats && `нерозміщених: ${stats.devices.unplaced}`}
      />
      <Stat
        label="Порти увімкнено"
        value={stats && `${stats.ports.up}/${stats.ports.total}`}
        hint={
          stats && stats.ports.total > 0
            ? `${Math.round((stats.ports.up / stats.ports.total) * 100)}%`
            : undefined
        }
      />
      <Stat
        label="Кабелі на планах"
        value={stats?.links.total}
        tone={stats?.links.down ? 'danger' : 'default'}
        hint={stats && (stats.links.down ? `розірвано: ${stats.links.down}` : 'усі активні')}
      />
      <Stat
        label="Плани"
        value={stats?.floorPlans}
        hint={stats && `будівель: ${stats.buildings}`}
      />
      <Stat
        label="Контролер ONOS"
        value={
          c
            ? c.controllerReachable == null
              ? '—'
              : c.controllerReachable
                ? 'Доступний'
                : 'Недоступний'
            : undefined
        }
        tone={
          c?.controllerReachable === false
            ? 'danger'
            : c?.controllerReachable
              ? 'success'
              : 'default'
        }
        hint={
          c &&
          (c.enabled
            ? `синхронізація: ${timeAgo(c.lastSuccessAt)}`
            : 'автоматичне опитування вимкнено')
        }
        className="col-span-2"
      />
    </div>
  );
}

const TONES = { default: '', danger: 'text-danger', success: 'text-success' } as const;

function Stat({
  label,
  value,
  hint,
  tone = 'default',
  className = '',
}: {
  label: string;
  value: ReactNode | undefined;
  hint?: ReactNode;
  tone?: keyof typeof TONES;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-border bg-surface p-4 ${className}`}>
      <p className="text-xs font-medium text-muted uppercase">{label}</p>
      {value === undefined ? (
        <span className="mt-2 block h-7 w-16 animate-pulse rounded bg-surface-muted" />
      ) : (
        <p className={`mt-1 text-2xl font-semibold tabular-nums ${TONES[tone]}`}>{value}</p>
      )}
      {hint && <p className="mt-0.5 truncate text-xs text-muted">{hint}</p>}
    </div>
  );
}

function BuildingsCard() {
  const { data: buildings, isPending } = useBuildings();
  return (
    <div className="rounded-xl border border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="font-semibold">Будівлі та поверхи</h2>
        <Link href="/plans" className="text-sm text-accent hover:underline">
          Усі плани
        </Link>
      </div>
      <div className="divide-y divide-border">
        {isPending && <p className="p-4 text-sm text-muted">Завантаження…</p>}
        {buildings?.length === 0 && (
          <p className="p-4 text-sm text-muted">
            Планів ще немає.{' '}
            <Link href="/plans/new" className="text-accent hover:underline">
              Завантажте перший
            </Link>
          </p>
        )}
        {buildings?.map((b) => (
          <div key={b.building} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
            <span className="w-40 shrink-0 truncate text-sm font-medium">
              {b.building || 'Без будівлі'}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[...b.floors]
                .sort((x, y) => y.floorLevel - x.floorLevel)
                .map((f) => (
                  <Link
                    key={f.id}
                    href={`/plans/${f.id}`}
                    title={f.title}
                    className="rounded-md border border-border px-2.5 py-1 text-sm hover:border-accent hover:text-accent"
                  >
                    {b.building ? `${f.floorLevel} пов.` : f.title}
                  </Link>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const SEVERITY_DOT: Record<SystemEventSeverity, string> = {
  info: 'bg-accent',
  warning: 'bg-amber-500',
  critical: 'bg-danger',
};

function EventFeed() {
  const { data: events, isPending } = useEventFeed(30);
  const now = useNow();
  return (
    <div className="flex max-h-[32rem] flex-col rounded-xl border border-border bg-surface">
      <div className="border-b border-border px-4 py-3">
        <h2 className="font-semibold">Події</h2>
        <p className="text-xs text-muted">Оновлюються в реальному часі</p>
      </div>
      <ol className="flex-1 divide-y divide-border overflow-y-auto" aria-live="polite">
        {isPending && <li className="p-4 text-sm text-muted">Завантаження…</li>}
        {events?.length === 0 && (
          <li className="p-4 text-sm text-muted">
            Подій ще немає. Вони з’являться, щойно щось зміниться в мережі.
          </li>
        )}
        {events?.map((e) => (
          <EventItem key={e.id} event={e} now={now} />
        ))}
      </ol>
    </div>
  );
}

function EventItem({ event, now }: { event: SystemEvent; now: number }) {
  const planId = event.floorPlanIds?.[0];
  return (
    <li className="flex gap-3 px-4 py-2.5">
      <span
        className={`mt-1.5 size-2 shrink-0 rounded-full ${SEVERITY_DOT[event.severity]}`}
        aria-label={event.severity}
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm [overflow-wrap:anywhere]">{event.message}</p>
        <p className="mt-0.5 text-xs text-muted">
          {EVENT_TYPE_LABELS[event.type] ?? event.type} ·{' '}
          <time dateTime={event.occurredAt}>{timeAgo(event.occurredAt, now)}</time>
          {planId && (
            <>
              {' · '}
              <Link href={`/plans/${planId}`} className="text-accent hover:underline">
                на плані
              </Link>
            </>
          )}
        </p>
      </div>
    </li>
  );
}
