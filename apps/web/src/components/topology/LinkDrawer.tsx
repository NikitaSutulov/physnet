'use client';

import { useState } from 'react';
import {
  CABLE_TYPES,
  type CableTypeName,
  type PlacedDevice,
  type TopologyLink,
} from '@physnet/shared';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { CABLE_TYPE_LABELS } from '@/lib/format';

interface Props {
  link: TopologyLink;
  devices: ReadonlyMap<string, PlacedDevice>;
  deleting: boolean;
  error: string | null;
  onCableType: (cableType: CableTypeName) => void;
  onClearWaypoints: () => void;
  onDelete: () => void;
  onClose: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Активний',
  DOWN: 'Розірваний',
  INACTIVE: 'Неактивний',
};

export function LinkDrawer({
  link,
  devices,
  deleting,
  error,
  onCableType,
  onClearWaypoints,
  onDelete,
  onClose,
}: Props) {
  const [confirming, setConfirming] = useState(false);
  const fromOnos = link.onosLinkId !== null;
  const end = (e: TopologyLink['source']) => (
    <>
      <span className="font-medium">{devices.get(e.deviceId)?.name ?? '—'}</span>
      <span className="text-muted"> · порт {e.portNumber}</span>
    </>
  );

  return (
    <aside
      className="absolute top-3 right-3 bottom-16 flex w-72 flex-col overflow-hidden rounded-xl border border-border bg-surface/95 shadow-lg backdrop-blur"
      aria-label="Кабель"
    >
      <header className="flex items-start gap-2 border-b border-border p-3">
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">Кабель</h2>
          <p className="truncate text-xs text-muted">
            {fromOnos ? 'Лінк, виявлений контролером ONOS' : 'Проведений вручну'}
          </p>
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
          <dt className="text-muted">Від</dt>
          <dd className="truncate">{end(link.source)}</dd>
          <dt className="text-muted">До</dt>
          <dd className="truncate">{end(link.destination)}</dd>
          <dt className="text-muted">Стан</dt>
          <dd className={link.status === 'DOWN' ? 'text-danger' : 'text-success'}>
            {STATUS_LABELS[link.status] ?? link.status}
          </dd>
          <dt className="text-muted">Згини</dt>
          <dd>{link.waypoints.length}</dd>
        </dl>

        <fieldset className="mt-4">
          <legend className="mb-1.5 text-xs font-medium text-muted uppercase">Тип кабелю</legend>
          <div className="flex gap-2">
            {CABLE_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={link.cableType === t}
                onClick={() => link.cableType !== t && onCableType(t)}
                className={`h-8 flex-1 rounded-md border text-sm transition-colors ${
                  link.cableType === t
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-border hover:bg-surface-muted'
                }`}
              >
                {CABLE_TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </fieldset>

        <p className="mt-4 rounded-md bg-surface-muted p-2.5 text-xs leading-5 text-muted">
          Клік по кабелю додає згин, згин можна перетягнути, а правий або подвійний клік по ньому
          видаляє згин.
        </p>
        {fromOnos && (
          <p className="mt-2 text-xs leading-5 text-muted">
            Цей кабель відображає лінк ONOS і зникне з плану разом з одним із його пристроїв.
          </p>
        )}
      </div>

      <footer className="flex flex-col gap-2 border-t border-border p-3">
        <Button
          variant="secondary"
          className="w-full"
          onClick={onClearWaypoints}
          disabled={link.waypoints.length === 0}
        >
          Прибрати згини
        </Button>
        {!fromOnos && (
          <Button
            variant="danger"
            className="w-full"
            onClick={() => setConfirming(true)}
            loading={deleting}
          >
            Видалити кабель
          </Button>
        )}
        {error && !confirming && <p className="text-xs text-danger">{error}</p>}
      </footer>

      <ConfirmDialog
        open={confirming}
        title="Видалити кабель"
        confirmLabel="Видалити"
        destructive
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          onDelete();
        }}
      >
        Кабель між {devices.get(link.source.deviceId)?.name} і{' '}
        {devices.get(link.destination.deviceId)?.name} буде видалено з плану.
      </ConfirmDialog>
    </aside>
  );
}
