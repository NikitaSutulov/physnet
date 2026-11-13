'use client';

import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import { useCallback, useEffect, useRef } from 'react';
import { Stage } from 'react-konva';
import { useElementSize } from '@/hooks/useElementSize';
import { useImage } from '@/hooks/useImage';
import { fitCamera, zoomAt, ZOOM_STEP, type Point } from '@/lib/geometry';
import { useCanvasStore } from '@/store/canvasStore';
import { BackgroundLayer } from './BackgroundLayer';
import { CanvasToolbar } from './CanvasToolbar';

export interface FloorCanvasProps {
  planId: string;
  imageUrl: string;
  width: number;
  height: number;
}

export default function FloorCanvas({ planId, imageUrl, width, height }: FloorCanvasProps) {
  const [containerRef, viewport] = useElementSize<HTMLDivElement>();
  const stageRef = useRef<Konva.Stage>(null);
  const [image, imageStatus] = useImage(imageUrl);

  const camera = useCanvasStore((s) => s.camera);
  const setCamera = useCanvasStore((s) => s.setCamera);
  const gridVisible = useCanvasStore((s) => s.gridVisible);
  const gridStep = useCanvasStore((s) => s.gridStep);
  const toggleGrid = useCanvasStore((s) => s.toggleGrid);

  const fit = useCallback(() => {
    if (viewport.width && viewport.height) {
      setCamera(fitCamera({ width, height }, viewport));
    }
  }, [viewport, width, height, setCamera]);

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

  const handleDragEnd = useCallback(
    (e: KonvaEventObject<DragEvent>) => {
      if (e.target !== stageRef.current) return; // a child node was dragged
      const { camera: current } = useCanvasStore.getState();
      setCamera({ ...current, x: e.target.x(), y: e.target.y() });
    },
    [setCamera],
  );

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden bg-surface-muted">
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
          onDragEnd={handleDragEnd}
          onMouseDown={(e) => (e.target.getStage()!.container().style.cursor = 'grabbing')}
          onMouseUp={(e) => (e.target.getStage()!.container().style.cursor = 'grab')}
          style={{ cursor: 'grab' }}
        >
          <BackgroundLayer
            image={image}
            width={width}
            height={height}
            scale={camera.scale}
            gridVisible={gridVisible}
            gridStep={gridStep}
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
        onZoomIn={() => zoomBy(ZOOM_STEP)}
        onZoomOut={() => zoomBy(1 / ZOOM_STEP)}
        onFit={fit}
        onToggleGrid={toggleGrid}
      />
    </div>
  );
}
