'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  FloorPlanResponse,
  NetworkDeviceWithPorts,
  PlacedDevice,
  TopologyLink,
  Waypoint,
} from '@physnet/shared';
import { useRealtime } from '@/hooks/useRealtime';
import {
  useCreateLink,
  useDeleteLink,
  useMoveDevice,
  useSetPortEnabled,
  useTopology,
  useUnplaceDevice,
  useUnplacedDevices,
  useUpdateLink,
} from '@/hooks/useTopology';
import { screenToPlan, type Point } from '@/lib/geometry';
import { busyPortIds, normaliseRotation, placePoint } from '@/lib/topology';
import { errorMessage } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { useCanvasStore } from '@/store/canvasStore';
import { ConnectDialog, type ConnectRequest } from './ConnectDialog';
import { DeviceDrawer } from './DeviceDrawer';
import { LinkDrawer } from './LinkDrawer';
import type { Selection } from './selection';
import { UnplacedDevicesPanel } from './UnplacedDevicesPanel';

const FloorCanvas = dynamic(() => import('./FloorCanvas'), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-surface-muted" />,
});

export function PlanWorkspace({ plan }: { plan: FloorPlanResponse }) {
  const planId = plan.id;
  const { data: topology } = useTopology(planId);
  useRealtime(planId);
  const unplaced = useUnplacedDevices(planId);
  const moveDevice = useMoveDevice(planId);
  const unplaceDevice = useUnplaceDevice(planId);
  const createLink = useCreateLink(planId);
  const updateLink = useUpdateLink(planId);
  const deleteLink = useDeleteLink(planId);
  const setPort = useSetPortEnabled(planId);
  const isAdmin = useAuthStore((s) => s.user?.role === 'ADMIN');

  const [selection, setSelection] = useState<Selection | null>(null);
  const [connectFromId, setConnectFromId] = useState<string | null>(null);
  const [connectEnds, setConnectEnds] = useState<{
    source: PlacedDevice;
    target: PlacedDevice;
  } | null>(null);

  const devices = useMemo(() => topology?.devices ?? [], [topology]);
  const links = useMemo(() => topology?.links ?? [], [topology]);
  const deviceById = useMemo(() => new Map(devices.map((d) => [d.id, d])), [devices]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (connectFromId !== null) setConnectFromId(null);
      else setSelection(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [connectFromId]);

  const startConnect = useCallback((deviceId: string) => {
    setSelection({ kind: 'device', id: deviceId });
    setConnectFromId(deviceId);
  }, []);

  const handleSelect = useCallback(
    (next: Selection | null) => {
      if (connectFromId === null) {
        setSelection(next);
        return;
      }
      setConnectFromId(null);
      const source = deviceById.get(connectFromId);
      const target = next?.kind === 'device' ? deviceById.get(next.id) : undefined;
      if (source && target && target.id !== source.id) {
        createLink.reset();
        setConnectEnds({ source, target });
      }
    },
    [connectFromId, deviceById, createLink],
  );

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
      setSelection({ kind: 'device', id: device.id });
    },
    [move],
  );
  const handleDrop = useCallback(
    (deviceId: string, point: Point) => {
      const device = unplaced.data?.find((d) => d.id === deviceId);
      if (device) place(device, point);
    },
    [unplaced.data, place],
  );
  const placeAtCentre = (device: NetworkDeviceWithPorts) => {
    const { camera, viewport, snapEnabled, gridStep } = useCanvasStore.getState();
    const centre = screenToPlan({ x: viewport.width / 2, y: viewport.height / 2 }, camera);
    place(device, placePoint(centre, plan, snapEnabled ? gridStep : 0));
  };

  const { mutate: update } = updateLink;
  const handleWaypointsChange = useCallback(
    (link: TopologyLink, waypoints: Waypoint[]) => update({ link, waypoints }),
    [update],
  );

  const connect = (request: ConnectRequest) =>
    createLink.mutate(request, {
      onSuccess: (link) => {
        setConnectEnds(null);
        setSelection({ kind: 'link', id: link.id });
      },
    });

  const selectedDevice =
    selection?.kind === 'device' ? (deviceById.get(selection.id) ?? null) : null;
  const selectedLink =
    selection?.kind === 'link' ? (links.find((l) => l.id === selection.id) ?? null) : null;
  const busyPorts = useMemo(() => busyPortIds(links), [links]);

  const failure = moveDevice.error ?? updateLink.error;

  return (
    <div className="flex min-h-0 flex-1 gap-3">
      <UnplacedDevicesPanel
        devices={unplaced.data}
        building={plan.building}
        loading={unplaced.isPending}
        onPlace={placeAtCentre}
      />
      <div className="relative flex-1 overflow-hidden rounded-xl border border-border">
        <FloorCanvas
          planId={planId}
          imageUrl={plan.imageUrl}
          width={plan.width}
          height={plan.height}
          devices={devices}
          links={links}
          selection={selection}
          onSelect={handleSelect}
          connectFromId={connectFromId}
          onStartConnect={startConnect}
          onWaypointsChange={handleWaypointsChange}
          onMove={handleMove}
          onRotate={handleRotate}
          onDropDevice={handleDrop}
        />

        {connectFromId && (
          <p
            role="status"
            className="absolute top-3 left-3 max-w-[calc(100%-20rem)] rounded-md bg-accent px-3 py-1.5 text-sm text-white shadow"
          >
            Оберіть пристрій, до якого провести кабель · Esc — скасувати
          </p>
        )}
        {failure && !connectFromId && (
          <p
            role="alert"
            className="absolute top-3 left-3 max-w-[calc(100%-20rem)] rounded-md bg-danger px-3 py-1.5 text-sm text-white shadow"
          >
            {errorMessage(failure, 'Не вдалося зберегти зміни')}
          </p>
        )}

        {selectedDevice && (
          <DeviceDrawer
            key={selectedDevice.id}
            device={selectedDevice}
            linkCount={
              links.filter(
                (l) =>
                  l.source.deviceId === selectedDevice.id ||
                  l.destination.deviceId === selectedDevice.id,
              ).length
            }
            removing={unplaceDevice.isPending}
            error={
              unplaceDevice.isError
                ? errorMessage(unplaceDevice.error, 'Не вдалося прибрати пристрій')
                : null
            }
            onRemove={() => unplaceDevice.mutate(selectedDevice.id)}
            onConnect={() => startConnect(selectedDevice.id)}
            onTogglePort={
              isAdmin && selectedDevice.deviceType !== 'HOST'
                ? (portId, isEnabled) => setPort.mutate({ portId, isEnabled })
                : undefined
            }
            pendingPortId={setPort.isPending ? setPort.variables.portId : null}
            portError={
              setPort.isError ? errorMessage(setPort.error, 'Не вдалося змінити стан порту') : null
            }
            onClose={() => setSelection(null)}
          />
        )}
        {selectedLink && (
          <LinkDrawer
            key={selectedLink.id}
            link={selectedLink}
            devices={deviceById}
            deleting={deleteLink.isPending}
            error={
              deleteLink.isError
                ? errorMessage(deleteLink.error, 'Не вдалося видалити кабель')
                : null
            }
            onCableType={(cableType) => update({ link: selectedLink, cableType })}
            onClearWaypoints={() => update({ link: selectedLink, waypoints: [] })}
            onDelete={() =>
              deleteLink.mutate(selectedLink.id, { onSuccess: () => setSelection(null) })
            }
            onClose={() => setSelection(null)}
          />
        )}
      </div>

      <ConnectDialog
        ends={connectEnds}
        busyPorts={busyPorts}
        saving={createLink.isPending}
        error={
          createLink.isError ? errorMessage(createLink.error, 'Не вдалося провести кабель') : null
        }
        onSubmit={connect}
        onClose={() => setConnectEnds(null)}
      />
    </div>
  );
}
