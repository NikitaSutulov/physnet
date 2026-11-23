'use client';

import type { KonvaEventObject } from 'konva/lib/Node';
import { memo, useMemo, useState } from 'react';
import { Circle, Group, Image as KonvaImage, Layer, Line, Rect, Stage } from 'react-konva';
import type { PlacedDevice, TopologyLink } from '@physnet/shared';
import { centreOn, visibleRect, type Camera, type Point, type Size } from '@/lib/geometry';
import { linkPoints } from '@/lib/topology';
import { CANVAS_COLORS } from './canvasTheme';

const MAX_WIDTH = 200;
const MAX_HEIGHT = 140;

interface MiniMapProps {
  image?: HTMLImageElement;
  plan: Size;
  devices: PlacedDevice[];
  links: TopologyLink[];
  camera: Camera;
  viewport: Size;
  onCameraChange: (camera: Camera) => void;
}

export const MiniMap = memo(function MiniMap({
  image,
  plan,
  devices,
  links,
  camera,
  viewport,
  onCameraChange,
}: MiniMapProps) {
  const positions = useMemo(
    () => new Map<string, Point>(devices.map((d) => [d.id, d.position])),
    [devices],
  );
  const [open, setOpen] = useState(true);
  const k = Math.min(MAX_WIDTH / plan.width, MAX_HEIGHT / plan.height);
  const width = Math.round(plan.width * k);
  const height = Math.round(plan.height * k);
  const view = visibleRect(camera, viewport);

  const toPlan = (p: Point): Point => ({ x: p.x / k, y: p.y / k });
  const moveTo = (planPoint: Point) => onCameraChange(centreOn(camera, viewport, planPoint));

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="absolute bottom-3 left-3 rounded-lg border border-border bg-surface/95 px-2.5 py-1.5 text-sm shadow-sm backdrop-blur hover:bg-surface-muted"
      >
        Мінікарта
      </button>
    );
  }

  return (
    <div className="absolute bottom-3 left-3 overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-2 py-0.5 text-xs text-muted">
        Мінікарта
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-1 text-base leading-none hover:text-foreground"
          aria-label="Сховати мінікарту"
        >
          ×
        </button>
      </div>
      <Stage
        width={width}
        height={height}
        onClick={(e: KonvaEventObject<MouseEvent>) => {
          const p = e.target.getStage()?.getPointerPosition();
          if (p) moveTo(toPlan(p));
        }}
        style={{ cursor: 'pointer' }}
      >
        <Layer listening={false}>
          <Rect width={width} height={height} fill="#fff" />
          {image && <KonvaImage image={image} width={width} height={height} opacity={0.8} />}
          <Group scaleX={k} scaleY={k}>
            {links.map((l) => {
              const points = linkPoints(l, positions);
              const down = l.status === 'DOWN';
              return (
                points && (
                  <Line
                    key={l.id}
                    points={points}
                    stroke={down ? CANVAS_COLORS.linkDown : CANVAS_COLORS.linkActive}
                    strokeWidth={down ? 1.5 : 1}
                    strokeScaleEnabled={false}
                    opacity={0.8}
                  />
                )
              );
            })}
          </Group>
          {devices.map((d) => (
            <Circle
              key={d.id}
              x={d.position.x * k}
              y={d.position.y * k}
              radius={2.5}
              fill={d.status === 'ACTIVE' ? CANVAS_COLORS.accent : CANVAS_COLORS.offline}
            />
          ))}
        </Layer>
        <Layer>
          <Group clipX={0} clipY={0} clipWidth={width} clipHeight={height}>
            <Rect
              x={view.x * k}
              y={view.y * k}
              width={view.width * k}
              height={view.height * k}
              stroke={CANVAS_COLORS.accent}
              strokeWidth={1.5}
              fill="rgba(14, 116, 144, 0.12)"
              draggable
              onMouseEnter={(e) => {
                const stage = e.target.getStage();
                if (stage) stage.container().style.cursor = 'move';
              }}
              onMouseLeave={(e) => {
                const stage = e.target.getStage();
                if (stage) stage.container().style.cursor = 'pointer';
              }}
              onDragMove={(e) => {
                const topLeft = toPlan(e.target.position());
                onCameraChange({
                  scale: camera.scale,
                  x: -topLeft.x * camera.scale,
                  y: -topLeft.y * camera.scale,
                });
              }}
              onClick={(e) => {
                e.cancelBubble = true;
              }}
            />
          </Group>
        </Layer>
      </Stage>
    </div>
  );
});
