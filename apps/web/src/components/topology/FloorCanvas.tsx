'use client';

import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent as ReactDragEvent,
} from 'react';
import { Stage } from 'react-konva';
import type { PlacedDevice, TopologyLink, Waypoint } from '@physnet/shared';
import { useElementSize } from '@/hooks/useElementSize';
import { useImage } from '@/hooks/useImage';
import { fitCamera, zoomAt, ZOOM_STEP, type Point } from '@/lib/geometry';
import { DEVICE_DRAG_TYPE, insertWaypoint, placePoint } from '@/lib/topology';
import { useCanvasStore } from '@/store/canvasStore';
import { BackgroundLayer } from './BackgroundLayer';
import { CanvasToolbar } from './CanvasToolbar';
import { DevicesLayer } from './DevicesLayer';
import { InteractionLayer } from './InteractionLayer';
import { LinksLayer } from './LinksLayer';
import type { Selection, WaypointDraft } from './selection';

export interface FloorCanvasProps {
  planId: string;
  imageUrl: string;
  width: number;
  height: number;
  devices: PlacedDevice[];
  links: TopologyLink[];
  selection: Selection | null;
  onSelect: (selection: Selection | null) => void;
  connectFromId: string | null;
  onStartConnect: (deviceId: string) => void;
  onWaypointsChange: (link: TopologyLink, waypoints: Waypoint[]) => void;
  onMove: (device: PlacedDevice, point: Point) => void;
  onRotate: (device: PlacedDevice, rotation: number) => void;
  onDropDevice: (deviceId: string, point: Point) => void;
}

export default function FloorCanvas({
  planId,
  imageUrl,
  width,
  height,
  devices,
  links,
  selection,
  onSelect,
  connectFromId,
  onStartConnect,
  onWaypointsChange,
  onMove,
  onRotate,
  onDropDevice,
}: FloorCanvasProps) {
  const [containerRef, viewport] = useElementSize<HTMLDivElement>();
  const stageRef = useRef<Konva.Stage>(null);
  const [image, imageStatus] = useImage(imageUrl);
  const [dropActive, setDropActive] = useState(false);
  const [dragging, setDragging] = useState<{ id: string; point: Point } | null>(null);
  const [draft, setDraft] = useState<WaypointDraft | null>(null);
  const [pointer, setPointer] = useState<{ fromId: string; point: Point } | null>(null);

  const camera = useCanvasStore((s) => s.camera);
  const setCamera = useCanvasStore((s) => s.setCamera);
  const setViewport = useCanvasStore((s) => s.setViewport);
  const gridVisible = useCanvasStore((s) => s.gridVisible);
  const gridStep = useCanvasStore((s) => s.gridStep);
  const snapEnabled = useCanvasStore((s) => s.snapEnabled);
  const toggleGrid = useCanvasStore((s) => s.toggleGrid);
  const toggleSnap = useCanvasStore((s) => s.toggleSnap);

  const plan = useMemo(() => ({ width, height }), [width, height]);
  const snapStep = snapEnabled ? gridStep : 0;

  useEffect(() => setViewport(viewport), [viewport, setViewport]);

  const fit = useCallback(() => {
    if (viewport.width && viewport.height) {
      setCamera(fitCamera(plan, viewport));
    }
  }, [viewport, plan, setCamera]);

  const fittedFor = useRef<string | null>(null);
  useEffect(() => {
    if (fittedFor.current === planId || !viewport.width || !viewport.height) return;
    fittedFor.current = planId;
    fit();
  }, [planId, viewport, fit]);

  const zoomBy = useCallback(
    (factor: number, anchor?: Point) => {
      const { camera: current } = useCanvasStore.getState();
      const point = anchor ?? { x: viewport.width / 2, y: viewport.height / 2 };
      setCamera(zoomAt(current, point, current.scale * factor));
    },
    [viewport, setCamera],
  );

  const handleWheel = useCallback(
    (e: KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();
      const pointer = stageRef.current?.getPointerPosition();
      if (!pointer) return;
      const factor = Math.exp(-e.evt.deltaY * (e.evt.ctrlKey ? 0.01 : 0.0015));
      zoomBy(factor, pointer);
    },
    [zoomBy],
  );

  const handleStageDragEnd = useCallback(
    (e: KonvaEventObject<DragEvent>) => {
      if (e.target !== stageRef.current) return; // a device was dragged
      const { camera: current } = useCanvasStore.getState();
      setCamera({ ...current, x: e.target.x(), y: e.target.y() });
    },
    [setCamera],
  );

  const handleDeviceDragMove = useCallback(
    (id: string, point: Point) => setDragging({ id, point }),
    [],
  );

  const handleDeviceDragEnd = useCallback(
    (device: PlacedDevice, point: Point): Point => {
      const placed = placePoint(point, plan, snapStep);
      setDragging(null);
      if (placed.x !== device.position.x || placed.y !== device.position.y) {
        onMove(device, placed);
      }
      return placed;
    },
    [plan, snapStep, onMove],
  );

  const positions = useMemo(() => {
    const map = new Map<string, Point>(devices.map((d) => [d.id, d.position]));
    if (dragging) map.set(dragging.id, dragging.point);
    return map;
  }, [devices, dragging]);

  const selectedDeviceId = selection?.kind === 'device' ? selection.id : null;
  const selectedLinkId = selection?.kind === 'link' ? selection.id : null;
  const selectedDevice = useMemo(
    () => devices.find((d) => d.id === selectedDeviceId) ?? null,
    [devices, selectedDeviceId],
  );
  const selectedLink = useMemo(
    () => links.find((l) => l.id === selectedLinkId) ?? null,
    [links, selectedLinkId],
  );

  const selectDevice = useCallback((id: string) => onSelect({ kind: 'device', id }), [onSelect]);
  const selectLink = useCallback((id: string) => onSelect({ kind: 'link', id }), [onSelect]);

  const handleClickSelectedLink = useCallback(
    (link: TopologyLink, point: Point) => {
      const from = positions.get(link.source.deviceId);
      const to = positions.get(link.destination.deviceId);
      if (!from || !to) return;
      onWaypointsChange(
        link,
        insertWaypoint(from, to, link.waypoints, placePoint(point, plan, snapStep)),
      );
    },
    [positions, plan, snapStep, onWaypointsChange],
  );

  const connectFrom = connectFromId ? positions.get(connectFromId) : undefined;
  const connectPreview =
    connectFrom && pointer?.fromId === connectFromId
      ? { from: connectFrom, to: pointer.point }
      : null;

  const acceptsDrop = (e: ReactDragEvent) => e.dataTransfer.types.includes(DEVICE_DRAG_TYPE);

  const handleDragOver = (e: ReactDragEvent<HTMLDivElement>) => {
    if (!acceptsDrop(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropActive(true);
  };

  const handleDrop = (e: ReactDragEvent<HTMLDivElement>) => {
    setDropActive(false);
    const stage = stageRef.current;
    const deviceId = e.dataTransfer.getData(DEVICE_DRAG_TYPE);
    if (!stage || !deviceId) return;
    e.preventDefault();
    stage.setPointersPositions(e.nativeEvent);
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const planPoint = stage.getAbsoluteTransform().copy().invert().point(pointer);
    onDropDevice(deviceId, placePoint(planPoint, plan, snapStep));
  };

  return (
    <div
      ref={containerRef}
      onDragOver={handleDragOver}
      onDragLeave={() => setDropActive(false)}
      onDrop={handleDrop}
      className={`relative h-full w-full overflow-hidden bg-surface-muted ${
        dropActive ? 'outline-2 -outline-offset-2 outline-accent outline-dashed' : ''
      }`}
    >
      {viewport.width > 0 && (
        <Stage
          ref={stageRef}
          width={viewport.width}
          height={viewport.height}
          scaleX={camera.scale}
          scaleY={camera.scale}
          x={camera.x}
          y={camera.y}
          draggable
          onWheel={handleWheel}
          onDragEnd={handleStageDragEnd}
          onClick={(e) => e.target === e.target.getStage() && onSelect(null)}
          onTap={(e) => e.target === e.target.getStage() && onSelect(null)}
          onMouseMove={(e) => {
            const point = connectFromId && e.target.getStage()?.getRelativePointerPosition();
            if (point) setPointer({ fromId: connectFromId, point });
          }}
          onMouseDown={(e) => (e.target.getStage()!.container().style.cursor = 'grabbing')}
          onMouseUp={(e) =>
            (e.target.getStage()!.container().style.cursor = connectFromId ? 'crosshair' : 'grab')
          }
          onContextMenu={(e) => e.evt.preventDefault()}
          style={{ cursor: connectFromId ? 'crosshair' : 'grab' }}
        >
          <BackgroundLayer
            image={image}
            width={width}
            height={height}
            scale={camera.scale}
            gridVisible={gridVisible}
            gridStep={gridStep}
          />
          <LinksLayer
            links={links}
            positions={positions}
            selectedId={selectedLinkId}
            draft={draft}
            onSelect={selectLink}
            onClickSelected={handleClickSelectedLink}
          />
          <DevicesLayer
            devices={devices}
            camera={camera}
            plan={plan}
            selectedId={selectedDeviceId}
            onSelect={selectDevice}
            onStartConnect={onStartConnect}
            onDragMove={handleDeviceDragMove}
            onDragEnd={handleDeviceDragEnd}
          />
          <InteractionLayer
            camera={camera}
            plan={plan}
            snapStep={snapStep}
            selectedDevice={selectedDevice}
            onRotate={onRotate}
            selectedLink={selectedLink}
            draft={draft}
            onDraft={setDraft}
            onWaypointsChange={onWaypointsChange}
            connectPreview={connectPreview}
          />
        </Stage>
      )}

      {imageStatus !== 'loaded' && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="rounded-md bg-surface/90 px-3 py-1.5 text-sm text-muted shadow-sm">
            {imageStatus === 'failed'
              ? 'Не вдалося завантажити зображення плану'
              : 'Завантаження плану…'}
          </span>
        </div>
      )}

      <CanvasToolbar
        scale={camera.scale}
        gridVisible={gridVisible}
        snapEnabled={snapEnabled}
        onZoomIn={() => zoomBy(ZOOM_STEP)}
        onZoomOut={() => zoomBy(1 / ZOOM_STEP)}
        onFit={fit}
        onToggleGrid={toggleGrid}
        onToggleSnap={toggleSnap}
      />
    </div>
  );
}
