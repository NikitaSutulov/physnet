'use client';

import type { SyncSummary } from '@physnet/shared';
import { Button } from '@/components/ui/Button';
import { useRunSync, useSyncStatus } from '@/hooks/useDevices';
import { timeAgo } from '@/lib/format';
import { errorMessage } from '@/services/api';
import { useAuthStore } from '@/store/authStore';

function describe(summary: SyncSummary): string {
  const parts = [
    summary.devicesCreated && `нових пристроїв: ${summary.devicesCreated}`,
    summary.devicesWentOffline && `зникло: ${summary.devicesWentOffline}`,
    summary.linksCreated && `нових ліній: ${summary.linksCreated}`,
    summary.linksWentDown && `розірвано ліній: ${summary.linksWentDown}`,
  ].filter(Boolean);
  return parts.length ? parts.join(', ') : 'змін немає';
}

export function SyncPanel() {
  const { data: status } = useSyncStatus();
  const runSync = useRunSync();
  const isAdmin = useAuthStore((s) => s.user?.role === 'ADMIN');

  const reachable = status?.controllerReachable;
  const dot = reachable == null ? 'bg-muted' : reachable ? 'bg-success' : 'bg-danger';
  const label =
    reachable == null
      ? 'Стан контролера невідомий'
      : reachable
        ? 'ONOS доступний'
        : 'ONOS недоступний';

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-border bg-surface px-4 py-3">
      <span className="flex items-center gap-2 text-sm font-medium">
        <span className={`size-2.5 rounded-full ${dot}`} aria-hidden />
        {label}
      </span>
      <span className="text-sm text-muted">
        Остання успішна синхронізація: {timeAgo(status?.lastSuccessAt)}
        {status && !status.enabled && ' · автоматичне опитування вимкнено'}
      </span>
      {reachable === false && status?.lastError && (
        <span className="w-full text-xs text-danger sm:w-auto">{status.lastError}</span>
      )}
      <div className="ml-auto flex items-center gap-3">
        {runSync.isSuccess && (
          <span className="text-sm text-muted" role="status">
            Готово: {describe(runSync.data)}
          </span>
        )}
        {runSync.isError && (
          <span className="text-sm text-danger" role="alert">
            {errorMessage(runSync.error, 'Синхронізація не вдалася')}
          </span>
        )}
        {isAdmin && (
          <Button variant="secondary" loading={runSync.isPending} onClick={() => runSync.mutate()}>
            Синхронізувати
          </Button>
        )}
      </div>
    </div>
  );
}
