'use client';

import { useState } from 'react';
import type { PlacedDevice } from '@physnet/shared';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DEVICE_TYPE_LABELS, formatSpeed } from '@/lib/format';

interface Props {
  device: PlacedDevice;
  linkCount: number;
  removing: boolean;
  error: string | null;
  onRemove: () => void;
  onClose: () => void;
}

export function DeviceDrawer({ device, linkCount, removing, error, onRemove, onClose }: Props) {
  const [confirming, setConfirming] = useState(false);
  const active = device.status === 'ACTIVE';
  const { x, y, rotation } = device.position;

  return (
    <aside
      className="absolute top-3 right-3 bottom-16 flex w-72 flex-col overflow-hidden rounded-xl border border-border bg-surface/95 shadow-lg backdrop-blur"
      aria-label={`Пристрій ${device.name}`}
    >
      <header className="flex items-start gap-2 border-b border-border p-3">
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-semibold">{device.name}</h2>
          <p className="truncate font-mono text-xs text-muted">{device.onosDeviceId}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded px-1.5 text-lg leading-none text-muted hover:text-foreground"
          aria-label="Закрити"
        >
          ×
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-3 text-sm">
        <dl className="grid grid-cols-[6rem_1fr] gap-x-2 gap-y-1.5">
          <dt className="text-muted">Тип</dt>
          <dd>{DEVICE_TYPE_LABELS[device.deviceType] ?? device.deviceType}</dd>
          <dt className="text-muted">Стан</dt>
          <dd className={active ? 'text-success' : 'text-danger'}>
            {active ? 'Активний' : 'Недоступний'}
          </dd>
          <dt className="text-muted">IP</dt>
          <dd className="font-mono text-xs leading-5">{device.ipAddress ?? '—'}</dd>
          <dt className="text-muted">MAC</dt>
          <dd className="font-mono text-xs leading-5">{device.macAddress ?? '—'}</dd>
          <dt className="text-muted">Позиція</dt>
          <dd className="font-mono text-xs leading-5">
            {Math.round(x)}, {Math.round(y)} · {Math.round(rotation)}°
          </dd>
          <dt className="text-muted">Лінії</dt>
          <dd>{linkCount}</dd>
        </dl>

        <h3 className="mt-4 mb-1.5 text-xs font-medium text-muted uppercase">
          Порти ({device.ports.length})
        </h3>
        {device.ports.length === 0 ? (
          <p className="text-muted">Портів немає</p>
        ) : (
          <ul className="divide-y divide-border rounded-md border border-border">
            {device.ports.map((p) => (
              <li key={p.id} className="flex items-center gap-2 px-2 py-1 text-xs">
                <span className="w-8 font-mono">{p.portNumber}</span>
                <span className="flex-1 truncate text-muted">{formatSpeed(p.speedMbps)}</span>
                <span className={p.isEnabled ? 'text-success' : 'text-danger'}>
                  {p.isEnabled ? 'UP' : 'DOWN'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <footer className="border-t border-border p-3">
        <Button
          variant="secondary"
          className="w-full"
          onClick={() => (linkCount > 0 ? setConfirming(true) : onRemove())}
          loading={removing}
        >
          Прибрати з плану
        </Button>
        {error && !confirming && <p className="mt-2 text-xs text-danger">{error}</p>}
      </footer>

      <ConfirmDialog
        open={confirming}
        title="Прибрати пристрій з плану"
        confirmLabel="Прибрати"
        destructive
        loading={removing}
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          onRemove();
        }}
      >
        Разом з <b className="text-foreground">{device.name}</b> з цього плану зникнуть лінії
        зв’язку, підключені до нього ({linkCount}). Лінії з ONOS з’являться знову, коли пристрій
        повернеться на план.
      </ConfirmDialog>
    </aside>
  );
}
