'use client';

import { Fragment, useDeferredValue, useState } from 'react';
import { DEVICE_TYPES, type DeviceTypeName, type NetworkDeviceWithPorts } from '@physnet/shared';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useDeleteDevice, useDevices, useOfflineSummary } from '@/hooks/useDevices';
import { DEVICE_TYPE_LABELS, formatSpeed } from '@/lib/format';
import { errorMessage } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { PurgeOfflineDialog } from './PurgeOfflineDialog';
import { RenameDeviceDialog } from './RenameDeviceDialog';
import { SyncPanel } from './SyncPanel';

const selectCls =
  'h-9 rounded-md border border-border bg-surface px-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/25';

export function DevicesView() {
  const [type, setType] = useState<DeviceTypeName | ''>('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search.trim());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<NetworkDeviceWithPorts | null>(null);
  const [deleting, setDeleting] = useState<NetworkDeviceWithPorts | null>(null);
  const [purgeOpen, setPurgeOpen] = useState(false);
  const [purged, setPurged] = useState<number | null>(null);

  const isAdmin = useAuthStore((s) => s.user?.role === 'ADMIN');
  const { data: offline } = useOfflineSummary(isAdmin);
  const deleteDevice = useDeleteDevice();

  const {
    data: devices,
    isPending,
    error,
  } = useDevices({
    ...(type && { type }),
    ...(status && { status }),
    ...(deferredSearch && { search: deferredSearch }),
  });

  return (
    <section className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-semibold">Обладнання</h1>
        <p className="mt-1 text-sm text-muted">Пристрої та порти, виявлені контролером ONOS</p>
      </div>

      <SyncPanel />

      <div className="flex flex-wrap gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Назва, ONOS id або MAC"
          aria-label="Пошук пристроїв"
          className={`${selectCls} w-64 px-3`}
        />
        <select
          aria-label="Тип"
          value={type}
          onChange={(e) => setType(e.target.value as DeviceTypeName | '')}
          className={selectCls}
        >
          <option value="">Усі типи</option>
          {DEVICE_TYPES.map((t) => (
            <option key={t} value={t}>
              {DEVICE_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
        <select
          aria-label="Стан"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className={selectCls}
        >
          <option value="">Будь-який стан</option>
          <option value="ACTIVE">Активні</option>
          <option value="OFFLINE">Недоступні</option>
        </select>
        {isAdmin && (
          <div className="ml-auto flex items-center gap-3">
            {purged !== null && (
              <span role="status" className="text-sm text-muted">
                Видалено пристроїв: {purged}
              </span>
            )}
            <Button
              variant="secondary"
              disabled={!offline?.total}
              onClick={() => {
                setPurged(null);
                setPurgeOpen(true);
              }}
            >
              Очистити неактивні{offline?.total ? ` (${offline.total})` : ''}
            </Button>
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
          {errorMessage(error, 'Не вдалося завантажити пристрої')}
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border text-xs text-muted uppercase">
            <tr>
              <th className="px-4 py-2.5 font-medium">Пристрій</th>
              <th className="px-4 py-2.5 font-medium">Тип</th>
              <th className="px-4 py-2.5 font-medium">IP</th>
              <th className="px-4 py-2.5 font-medium">MAC</th>
              <th className="px-4 py-2.5 font-medium">Порти</th>
              <th className="px-4 py-2.5 font-medium">Стан</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {isPending && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted">
                  Завантаження…
                </td>
              </tr>
            )}
            {!isPending && devices?.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted">
                  {deferredSearch || type || status
                    ? 'Нічого не знайдено'
                    : 'Пристроїв ще немає. Вони з’являться після синхронізації з ONOS.'}
                </td>
              </tr>
            )}
            {devices?.map((d) => {
              const open = expanded === d.id;
              const up = d.ports.filter((p) => p.isEnabled).length;
              return (
                <Fragment key={d.id}>
                  <tr className="border-b border-border last:border-0 hover:bg-surface-muted/50">
                    <td className="px-4 py-2.5">
                      <button
                        type="button"
                        onClick={() => setExpanded(open ? null : d.id)}
                        aria-expanded={open}
                        className="flex items-center gap-2 text-left"
                      >
                        <span
                          className={`text-xs text-muted transition-transform ${open ? 'rotate-90' : ''}`}
                        >
                          ▶
                        </span>
                        <span>
                          <span className="block font-medium">{d.name}</span>
                          {d.name !== d.onosDeviceId && (
                            <span className="block font-mono text-xs text-muted">
                              {d.onosDeviceId}
                            </span>
                          )}
                        </span>
                      </button>
                    </td>
                    <td className="px-4 py-2.5">
                      {DEVICE_TYPE_LABELS[d.deviceType] ?? d.deviceType}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs">{d.ipAddress ?? '—'}</td>
                    <td className="px-4 py-2.5 font-mono text-xs">{d.macAddress ?? '—'}</td>
                    <td className="px-4 py-2.5 tabular-nums">
                      {up}/{d.ports.length}
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={d.status} />
                    </td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setRenaming(d)}
                        className="text-sm text-accent hover:underline"
                      >
                        Перейменувати
                      </button>
                      {isAdmin && d.status === 'OFFLINE' && (
                        <button
                          type="button"
                          onClick={() => {
                            deleteDevice.reset();
                            setDeleting(d);
                          }}
                          className="ml-3 text-sm text-danger hover:underline"
                        >
                          Видалити
                        </button>
                      )}
                    </td>
                  </tr>
                  {open && (
                    <tr className="border-b border-border bg-surface-muted/40">
                      <td colSpan={7} className="px-4 py-3">
                        <PortsTable device={d} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <RenameDeviceDialog device={renaming} onClose={() => setRenaming(null)} />
      <ConfirmDialog
        open={deleting !== null}
        title="Видалити пристрій"
        confirmLabel="Видалити"
        destructive
        loading={deleteDevice.isPending}
        error={
          deleteDevice.isError
            ? errorMessage(deleteDevice.error, 'Не вдалося видалити пристрій')
            : null
        }
        onCancel={() => setDeleting(null)}
        onConfirm={() =>
          deleting && deleteDevice.mutate(deleting.id, { onSuccess: () => setDeleting(null) })
        }
      >
        Пристрій <b className="text-foreground">{deleting?.name}</b> буде видалено разом з портами,
        позиціями на планах і лініями зв’язку. Якщо контролер знову його побачить, синхронізація
        створить його заново.
      </ConfirmDialog>
      {purgeOpen && offline && (
        <PurgeOfflineDialog
          summary={offline}
          onClose={(deleted) => {
            setPurgeOpen(false);
            if (deleted !== undefined) setPurged(deleted);
          }}
        />
      )}
    </section>
  );
}

function StatusBadge({ status }: { status: string }) {
  const active = status === 'ACTIVE';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
        active ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
      }`}
    >
      <span
        className={`size-1.5 rounded-full ${active ? 'bg-success' : 'bg-danger'}`}
        aria-hidden
      />
      {active ? 'Активний' : 'Недоступний'}
    </span>
  );
}

function PortsTable({ device }: { device: NetworkDeviceWithPorts }) {
  if (device.ports.length === 0) return <p className="text-sm text-muted">Портів немає</p>;
  return (
    <table className="w-full max-w-3xl text-left text-xs">
      <thead className="text-muted">
        <tr>
          <th className="py-1 pr-4 font-medium">Порт</th>
          <th className="py-1 pr-4 font-medium">MAC</th>
          <th className="py-1 pr-4 font-medium">IP</th>
          <th className="py-1 pr-4 font-medium">Швидкість</th>
          <th className="py-1 font-medium">Стан</th>
        </tr>
      </thead>
      <tbody className="font-mono">
        {device.ports.map((p) => (
          <tr key={p.id}>
            <td className="py-1 pr-4">{p.portNumber}</td>
            <td className="py-1 pr-4">{p.macAddress ?? '—'}</td>
            <td className="py-1 pr-4">{p.ipAddress ?? '—'}</td>
            <td className="py-1 pr-4 font-sans">{formatSpeed(p.speedMbps)}</td>
            <td className={`py-1 font-sans ${p.isEnabled ? 'text-success' : 'text-danger'}`}>
              {p.isEnabled ? 'UP' : 'DOWN'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
