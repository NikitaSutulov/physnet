'use client';

import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import { useEffect, useRef } from 'react';
import { Circle, Layer, Line, Transformer } from 'react-konva';
import type { PlacedDevice, TopologyLink, Waypoint } from '@physnet/shared';
import {
  clamp,
  planToScreen,
  screenToPlan,
  type Camera,
  type Point,
  type Size,
} from '@/lib/geometry';
import { placePoint } from '@/lib/topology';
import { CANVAS_COLORS } from './canvasTheme';
import { deviceBodyId } from './DeviceNode';
import type { WaypointDraft } from './selection';

interface InteractionLayerProps {
  camera: Camera;
  plan: Size;
  snapStep: number;
  selectedDevice: PlacedDevice | null;
  onRotate: (device: PlacedDevice, rotation: number) => void;
  selectedLink: TopologyLink | null;
  draft: WaypointDraft | null;
  onDraft: (draft: WaypointDraft | null) => void;
  onWaypointsChange: (link: TopologyLink, waypoints: Waypoint[]) => void;
  connectPreview: { from: Point; to: Point } | null;
}

const ROTATION_SNAPS = Array.from({ length: 8 }, (_, i) => i * 45);

export function InteractionLayer({
  camera,
  plan,
  snapStep,
  selectedDevice,
  onRotate,
  selectedLink,
  draft,
  onDraft,
  onWaypointsChange,
  connectPreview,
}: InteractionLayerProps) {
  const transformerRef = useRef<Konva.Transformer>(null);
  const inverse = 1 / camera.scale;

  const position = selectedDevice?.position;
  useEffect(() => {
    const transformer = transformerRef.current;
    if (!transformer) return;
    const body = selectedDevice
      ? transformer.getStage()?.findOne<Konva.Group>(`#${deviceBodyId(selectedDevice.id)}`)
      : undefined;
    transformer.nodes(body ? [body] : []);
    transformer.getLayer()?.batchDraw();
  }, [selectedDevice, position]);

  const waypoints =
    selectedLink && (draft?.linkId === selectedLink.id ? draft.waypoints : selectedLink.waypoints);

  const dragBound = (pos: Point): Point => {
    const p = screenToPlan(pos, camera);
    return planToScreen({ x: clamp(p.x, 0, plan.width), y: clamp(p.y, 0, plan.height) }, camera);
  };

  const replaceAt = (index: number, point: Point) =>
    waypoints!.map((w, i) => (i === index ? { x: point.x, y: point.y } : w));

  const setCursor = (e: KonvaEventObject<MouseEvent>, cursor: string) => {
    const stage = e.target.getStage();
    if (stage) stage.container().style.cursor = cursor;
  };

  return (
    <Layer>
      <Transformer
        ref={transformerRef}
        resizeEnabled={false}
        rotateEnabled
        rotationSnaps={ROTATION_SNAPS}
        rotationSnapTolerance={6}
        rotateAnchorOffset={18}
        padding={6}
        borderStroke={CANVAS_COLORS.accent}
        anchorStroke={CANVAS_COLORS.accent}
        anchorCornerRadius={6}
        onTransformEnd={(e) => {
          if (selectedDevice) onRotate(selectedDevice, e.target.rotation());
        }}
      />

      {selectedLink &&
        waypoints?.map((w, index) => (
          <Circle
            key={index}
            x={w.x}
            y={w.y}
            radius={6 * inverse}
            fill="#fff"
            stroke={CANVAS_COLORS.accent}
            strokeWidth={2 * inverse}
            hitStrokeWidth={8 * inverse}
            draggable
            dragBoundFunc={dragBound}
            onMouseEnter={(e) => setCursor(e, 'move')}
            onMouseLeave={(e) => setCursor(e, 'grab')}
            onMouseDown={(e) => {
              e.cancelBubble = true;
            }}
            onDragMove={(e) =>
              onDraft({ linkId: selectedLink.id, waypoints: replaceAt(index, e.target.position()) })
            }
            onDragEnd={(e) => {
              e.cancelBubble = true;
              const point = placePoint(e.target.position(), plan, snapStep);
              e.target.position(point);
              onDraft(null);
              onWaypointsChange(selectedLink, replaceAt(index, point));
            }}
            onContextMenu={(e) => {
              e.evt.preventDefault();
              e.cancelBubble = true;
              onWaypointsChange(
                selectedLink,
                waypoints.filter((_, i) => i !== index),
              );
            }}
            onDblClick={(e) => {
              e.cancelBubble = true;
              onWaypointsChange(
                selectedLink,
                waypoints.filter((_, i) => i !== index),
              );
            }}
          />
        ))}

      {connectPreview && (
        <Line
          points={[
            connectPreview.from.x,
            connectPreview.from.y,
            connectPreview.to.x,
            connectPreview.to.y,
          ]}
          stroke={CANVAS_COLORS.accent}
          strokeWidth={2}
          dash={[6, 5]}
          strokeScaleEnabled={false}
          listening={false}
        />
      )}
    </Layer>
  );
}
