'use client';

import { useDeferredValue, useState } from 'react';
import type { NetworkDeviceWithPorts } from '@physnet/shared';
import { DEVICE_TYPE_LABELS } from '@/lib/format';
import { DEVICE_DRAG_TYPE } from '@/lib/topology';
import { CANVAS_COLORS } from './canvasTheme';

interface Props {
  devices: NetworkDeviceWithPorts[] | undefined;
  loading: boolean;
  onPlace: (device: NetworkDeviceWithPorts) => void;
}

export function UnplacedDevicesPanel({ devices, loading, onPlace }: Props) {
  const [search, setSearch] = useState('');
  const query = useDeferredValue(search.trim().toLowerCase());
  const visible = (devices ?? []).filter(
    (d) =>
      !query ||
      d.name.toLowerCase().includes(query) ||
      d.onosDeviceId.toLowerCase().includes(query) ||
      d.ipAddress?.includes(query),
  );

  return (
    <aside className="flex w-64 shrink-0 flex-col overflow-hidden rounded-xl border border-border bg-surface">
      <div className="border-b border-border p-3">
        <h2 className="text-sm font-semibold">
          Нерозміщені пристрої
          {devices && <span className="ml-1.5 font-normal text-muted">{devices.length}</span>}
        </h2>
        <p className="mt-0.5 text-xs text-muted">Перетягніть пристрій на план</p>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Пошук"
          aria-label="Пошук нерозміщених пристроїв"
          className="mt-2 h-8 w-full rounded-md border border-border bg-surface px-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
        />
      </div>
      <ul className="flex-1 overflow-y-auto p-1.5">
        {loading && <li className="p-3 text-sm text-muted">Завантаження…</li>}
        {!loading && visible.length === 0 && (
          <li className="p-3 text-sm text-muted">
            {query
              ? 'Нічого не знайдено'
              : devices?.length === 0
                ? 'Усі пристрої вже на плані'
                : null}
          </li>
        )}
        {visible.map((d) => (
          <li
            key={d.id}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData(DEVICE_DRAG_TYPE, d.id);
              e.dataTransfer.effectAllowed = 'move';
            }}
            className="group flex cursor-grab items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-surface-muted active:cursor-grabbing"
          >
            <span
              className="size-3 shrink-0 rounded-sm"
              style={{
                background: CANVAS_COLORS.device[d.deviceType] ?? CANVAS_COLORS.device.OTHER,
              }}
              aria-hidden
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm">{d.name}</span>
              <span className="block truncate text-xs text-muted">
                {DEVICE_TYPE_LABELS[d.deviceType] ?? d.deviceType}
                {d.status !== 'ACTIVE' && <span className="text-danger"> · недоступний</span>}
              </span>
            </span>
            <button
              type="button"
              onClick={() => onPlace(d)}
              className="rounded px-1.5 text-lg leading-none text-muted opacity-0 group-hover:opacity-100 hover:text-accent focus-visible:opacity-100"
              aria-label={`Розмістити ${d.name} в центрі видимої області`}
              title="Розмістити в центрі"
            >
              +
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
