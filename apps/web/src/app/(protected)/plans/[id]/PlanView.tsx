'use client';

import axios from 'axios';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import type { NetworkDeviceWithPorts, PlacedDevice } from '@physnet/shared';
import { DeviceDrawer } from '@/components/topology/DeviceDrawer';
import { UnplacedDevicesPanel } from '@/components/topology/UnplacedDevicesPanel';
import { useFloorPlan } from '@/hooks/useFloorPlans';
import {
  useMoveDevice,
  useTopology,
  useUnplaceDevice,
  useUnplacedDevices,
} from '@/hooks/useTopology';
import { screenToPlan, type Point } from '@/lib/geometry';
import { normaliseRotation, placePoint } from '@/lib/topology';
import { errorMessage } from '@/services/api';
import { useCanvasStore } from '@/store/canvasStore';
import { DeletePlanButton } from './DeletePlanButton';
import { EditPlanButton } from './EditPlanButton';

const FloorCanvas = dynamic(() => import('@/components/topology/FloorCanvas'), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-surface-muted" />,
});

export function PlanView({ id }: { id: string }) {
  const { data: plan, isPending, error } = useFloorPlan(id);
  const { data: topology } = useTopology(id);
  const unplaced = useUnplacedDevices(id);
  const moveDevice = useMoveDevice(id);
  const unplaceDevice = useUnplaceDevice(id);
  const [selection, setSelection] = useState<{ planId: string; deviceId: string } | null>(null);
  const selectedId = selection?.planId === id ? selection.deviceId : null;

  const select = useCallback(
    (deviceId: string | null) => setSelection(deviceId ? { planId: id, deviceId } : null),
    [id],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setSelection(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const { mutate: move } = moveDevice;
  const handleMove = useCallback(
    (device: PlacedDevice, point: Point) => move({ device, ...point }),
    [move],
  );
  const handleRotate = useCallback(
    (device: PlacedDevice, rotation: number) =>
      move({
        device,
        x: device.position.x,
        y: device.position.y,
        rotation: normaliseRotation(rotation),
      }),
    [move],
  );
  const place = useCallback(
    (device: NetworkDeviceWithPorts, point: Point) => {
      move({ device, ...point });
      select(device.id);
    },
    [move, select],
  );
  const handleDrop = useCallback(
    (deviceId: string, point: Point) => {
      const device = unplaced.data?.find((d) => d.id === deviceId);
      if (device) place(device, point);
    },
    [unplaced.data, place],
  );
  const placeAtCentre = (device: NetworkDeviceWithPorts) => {
    if (!plan) return;
    const { camera, viewport } = useCanvasStore.getState();
    const centre = screenToPlan({ x: viewport.width / 2, y: viewport.height / 2 }, camera);
    const { snapEnabled, gridStep } = useCanvasStore.getState();
    place(device, placePoint(centre, plan, snapEnabled ? gridStep : 0));
  };

  const selected = topology?.devices.find((d) => d.id === selectedId) ?? null;
  const selectedLinks = selected
    ? (topology?.links.filter(
        (l) => l.source.deviceId === selected.id || l.destination.deviceId === selected.id,
      ).length ?? 0)
    : 0;

  if (error) {
    const notFound = axios.isAxiosError(error) && [400, 404].includes(error.response?.status ?? 0);
    return (
      <div className="rounded-xl border border-border bg-surface p-8 text-center">
        <p className="font-medium">{notFound ? 'План не знайдено' : errorMessage(error)}</p>
        <Link href="/plans" className="mt-2 inline-block text-sm text-accent hover:underline">
          До каталогу планів
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100dvh-6.5rem)] min-h-[480px] flex-col gap-3">
      <div className="flex items-center gap-3">
        <Link href="/plans" className="text-sm text-muted hover:text-foreground">
          ← Плани
        </Link>
        {isPending ? (
          <span className="h-6 w-56 animate-pulse rounded bg-surface-muted" />
        ) : (
          <>
            <h1 className="truncate text-lg font-semibold">{plan.title}</h1>
            <span className="text-sm text-muted">
              {plan.building || 'Без будівлі'} · поверх {plan.floorLevel}
            </span>
            <span className="ml-auto font-mono text-xs text-muted">
              {plan.width}×{plan.height} px
            </span>
            <EditPlanButton plan={plan} />
            <DeletePlanButton planId={plan.id} title={plan.title} />
          </>
        )}
      </div>
      <div className="flex min-h-0 flex-1 gap-3">
        <UnplacedDevicesPanel
          devices={unplaced.data}
          loading={unplaced.isPending}
          onPlace={placeAtCentre}
        />
        <div className="relative flex-1 overflow-hidden rounded-xl border border-border">
          {plan && (
            <FloorCanvas
              planId={plan.id}
              imageUrl={plan.imageUrl}
              width={plan.width}
              height={plan.height}
              devices={topology?.devices ?? []}
              links={topology?.links ?? []}
              selectedId={selectedId}
              onSelect={select}
              onMove={handleMove}
              onRotate={handleRotate}
              onDropDevice={handleDrop}
            />
          )}
          {moveDevice.isError && (
            <p
              role="alert"
              className="absolute top-3 left-1/2 -translate-x-1/2 rounded-md bg-danger px-3 py-1.5 text-sm text-white shadow"
            >
              {errorMessage(moveDevice.error, 'Не вдалося зберегти позицію')}
            </p>
          )}
          {selected && (
            <DeviceDrawer
              key={selected.id}
              device={selected}
              linkCount={selectedLinks}
              removing={unplaceDevice.isPending}
              error={
                unplaceDevice.isError
                  ? errorMessage(unplaceDevice.error, 'Не вдалося прибрати пристрій')
                  : null
              }
              onRemove={() => unplaceDevice.mutate(selected.id)}
              onClose={() => select(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
