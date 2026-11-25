'use client';

import Link from 'next/link';
import { useDeferredValue, useState, type ReactNode } from 'react';
import type { NetworkDeviceWithPorts, PlanRef, UnplacedDevice } from '@physnet/shared';
import { DEVICE_TYPE_LABELS } from '@/lib/format';
import { DEVICE_DRAG_TYPE } from '@/lib/topology';
import { CANVAS_COLORS } from './canvasTheme';

interface Props {
  devices: UnplacedDevice[] | undefined;
  building: string;
  loading: boolean;
  onPlace: (device: NetworkDeviceWithPorts) => void;
}

export function UnplacedDevicesPanel({ devices, building, loading, onPlace }: Props) {
  const [search, setSearch] = useState('');
  const query = useDeferredValue(search.trim().toLowerCase());
  const visible = (devices ?? []).filter(
    (d) =>
      !query ||
      d.name.toLowerCase().includes(query) ||
      d.onosDeviceId.toLowerCase().includes(query) ||
      d.ipAddress?.includes(query),
  );
  const nowhere = visible.filter((d) => d.placedOn.length === 0);
  const elsewhere = visible.filter((d) => d.placedOn.length > 0);
  const item = (d: UnplacedDevice) => (
    <DeviceItem key={d.id} device={d} building={building} onPlace={onPlace} />
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
      <div className="flex-1 overflow-y-auto p-1.5">
        {loading && <p className="p-3 text-sm text-muted">Завантаження…</p>}
        {!loading && visible.length === 0 && (
          <p className="p-3 text-sm text-muted">
            {query
              ? 'Нічого не знайдено'
              : devices?.length === 0
                ? 'Усі пристрої вже на плані'
                : null}
          </p>
        )}
        {nowhere.length > 0 && (
          <Group title={elsewhere.length > 0 ? 'Ще ніде не розміщені' : undefined}>
            {nowhere.map(item)}
          </Group>
        )}
        {elsewhere.length > 0 && <Group title="На інших планах">{elsewhere.map(item)}</Group>}
      </div>
    </aside>
  );
}

function Group({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="mb-1.5">
      {title && (
        <h3 className="px-2 pt-1.5 pb-1 text-xs font-medium tracking-wide text-muted uppercase">
          {title}
        </h3>
      )}
      <ul>{children}</ul>
    </section>
  );
}

function DeviceItem({
  device: d,
  building,
  onPlace,
}: {
  device: UnplacedDevice;
  building: string;
  onPlace: (device: NetworkDeviceWithPorts) => void;
}) {
  return (
    <li
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(DEVICE_DRAG_TYPE, d.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
      className="group flex cursor-grab items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-surface-muted active:cursor-grabbing"
    >
      <span
        className="size-3 shrink-0 rounded-sm"
        style={{ background: CANVAS_COLORS.device[d.deviceType] ?? CANVAS_COLORS.device.OTHER }}
        aria-hidden
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm">{d.name}</span>
        <span className="block truncate text-xs text-muted">
          {DEVICE_TYPE_LABELS[d.deviceType] ?? d.deviceType}
          {d.status !== 'ACTIVE' && <span className="text-danger"> · недоступний</span>}
          {d.placedOn.map((p) => (
            <span key={p.id}>
              {' · '}
              <Link
                href={`/plans/${p.id}`}
                draggable={false}
                className="text-accent hover:underline"
                title={`Розміщено на плані «${planName(p, '')}». Перейти до нього`}
              >
                {planName(p, building)}
              </Link>
            </span>
          ))}
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
  );
}

function planName(plan: PlanRef, building: string): string {
  return plan.building && plan.building !== building
    ? `${plan.building} · ${plan.title}`
    : plan.title;
}
