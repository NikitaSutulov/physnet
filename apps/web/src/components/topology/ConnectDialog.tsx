'use client';

import { useId, useState } from 'react';
import { CABLE_TYPES, type CableTypeName, type PlacedDevice } from '@physnet/shared';
import { Button } from '@/components/ui/Button';
import { FormError } from '@/components/ui/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';
import { CABLE_TYPE_LABELS, formatSpeed } from '@/lib/format';

export interface ConnectRequest {
  sourcePortId: string;
  destinationPortId: string;
  cableType: CableTypeName;
}

interface Props {
  ends: { source: PlacedDevice; target: PlacedDevice } | null;
  busyPorts: ReadonlySet<string>;
  saving: boolean;
  error: string | null;
  onSubmit: (request: ConnectRequest) => void;
  onClose: () => void;
}

export function ConnectDialog({ ends, busyPorts, saving, error, onSubmit, onClose }: Props) {
  return (
    <Modal open={ends !== null} title="Новий кабель" onClose={onClose} locked={saving}>
      {ends && (
        <ConnectForm
          key={`${ends.source.id}:${ends.target.id}`}
          {...ends}
          busyPorts={busyPorts}
          saving={saving}
          error={error}
          onSubmit={onSubmit}
          onClose={onClose}
        />
      )}
    </Modal>
  );
}

function ConnectForm({
  source,
  target,
  busyPorts,
  saving,
  error,
  onSubmit,
  onClose,
}: Omit<Props, 'ends'> & { source: PlacedDevice; target: PlacedDevice }) {
  const firstFree = (d: PlacedDevice) => d.ports.find((p) => !busyPorts.has(p.id))?.id ?? '';
  const [sourcePortId, setSourcePortId] = useState(() => firstFree(source));
  const [destinationPortId, setDestinationPortId] = useState(() => firstFree(target));
  const [cableType, setCableType] = useState<CableTypeName>('COPPER');
  const ready = sourcePortId !== '' && destinationPortId !== '';

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (ready) onSubmit({ sourcePortId, destinationPortId, cableType });
      }}
    >
      <PortSelect
        device={source}
        busyPorts={busyPorts}
        value={sourcePortId}
        onChange={setSourcePortId}
      />
      <PortSelect
        device={target}
        busyPorts={busyPorts}
        value={destinationPortId}
        onChange={setDestinationPortId}
      />

      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-sm font-medium">Тип кабелю</legend>
        <div className="flex gap-2">
          {CABLE_TYPES.map((t) => (
            <label
              key={t}
              className={`flex h-9 flex-1 cursor-pointer items-center justify-center rounded-md border text-sm transition-colors ${
                cableType === t
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border hover:bg-surface-muted'
              }`}
            >
              <input
                type="radio"
                name="cableType"
                value={t}
                checked={cableType === t}
                onChange={() => setCableType(t)}
                className="sr-only"
              />
              {CABLE_TYPE_LABELS[t]}
            </label>
          ))}
        </div>
      </fieldset>

      {!ready && <FormError message="В одного з пристроїв немає вільних портів на цьому плані" />}
      {error && <FormError message={error} />}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
          Скасувати
        </Button>
        <Button type="submit" loading={saving} disabled={!ready}>
          З’єднати
        </Button>
      </div>
    </form>
  );
}

function PortSelect({
  device,
  busyPorts,
  value,
  onChange,
}: {
  device: PlacedDevice;
  busyPorts: ReadonlySet<string>;
  value: string;
  onChange: (portId: string) => void;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {device.name} <span className="font-normal text-muted">— порт</span>
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-md border border-border bg-surface px-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
      >
        {value === '' && <option value="">Немає вільних портів</option>}
        {device.ports.map((p) => {
          const busy = busyPorts.has(p.id);
          return (
            <option key={p.id} value={p.id} disabled={busy}>
              {p.portNumber}
              {p.speedMbps ? ` · ${formatSpeed(p.speedMbps)}` : ''}
              {!p.isEnabled ? ' · вимкнений' : ''}
              {busy ? ' — зайнятий' : ''}
            </option>
          );
        })}
      </select>
    </div>
  );
}
