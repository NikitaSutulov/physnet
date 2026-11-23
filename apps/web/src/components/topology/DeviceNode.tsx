'use client';

import type { KonvaEventObject } from 'konva/lib/Node';
import { memo } from 'react';
import { Circle, Group, Label, Line, Rect, Tag, Text } from 'react-konva';
import type { PlacedDevice } from '@physnet/shared';
import {
  clamp,
  planToScreen,
  screenToPlan,
  type Camera,
  type Point,
  type Size,
} from '@/lib/geometry';
import { CANVAS_COLORS } from './canvasTheme';

export const deviceBodyId = (deviceId: string) => `device-body-${deviceId}`;

interface DeviceNodeProps {
  device: PlacedDevice;
  camera: Camera;
  plan: Size;
  selected: boolean;
  onSelect: (id: string) => void;
  onStartConnect: (id: string) => void;
  onDragMove: (id: string, point: Point) => void;
  onDragEnd: (device: PlacedDevice, point: Point) => Point;
}

export const DeviceNode = memo(function DeviceNode({
  device,
  camera,
  plan,
  selected,
  onSelect,
  onStartConnect,
  onDragMove,
  onDragEnd,
}: DeviceNodeProps) {
  const inverse = 1 / camera.scale;
  const offline = device.status !== 'ACTIVE';

  const dragBound = (pos: Point): Point => {
    const p = screenToPlan(pos, camera);
    return planToScreen({ x: clamp(p.x, 0, plan.width), y: clamp(p.y, 0, plan.height) }, camera);
  };

  const setCursor = (e: KonvaEventObject<MouseEvent>, cursor: string) => {
    const stage = e.target.getStage();
    if (stage) stage.container().style.cursor = cursor;
  };

  return (
    <Group
      x={device.position.x}
      y={device.position.y}
      scaleX={inverse}
      scaleY={inverse}
      draggable
      dragDistance={3}
      dragBoundFunc={dragBound}
      onMouseDown={(e) => {
        e.cancelBubble = true;
        onSelect(device.id);
      }}
      onTap={() => onSelect(device.id)}
      onDblClick={() => onStartConnect(device.id)}
      onDblTap={() => onStartConnect(device.id)}
      onMouseEnter={(e) => setCursor(e, 'move')}
      onMouseLeave={(e) => setCursor(e, 'grab')}
      onDragMove={(e: KonvaEventObject<DragEvent>) =>
        onDragMove(device.id, e.currentTarget.position())
      }
      onDragEnd={(e: KonvaEventObject<DragEvent>) => {
        e.cancelBubble = true;
        const node = e.currentTarget;
        node.position(onDragEnd(device, node.position()));
      }}
    >
      {selected && (
        <Circle
          radius={30}
          stroke={CANVAS_COLORS.accent}
          strokeWidth={2}
          dash={[5, 4]}
          fill="rgba(14, 116, 144, 0.08)"
        />
      )}
      <Group
        id={deviceBodyId(device.id)}
        rotation={device.position.rotation}
        opacity={offline ? 0.55 : 1}
      >
        <DeviceIcon type={device.deviceType} />
      </Group>
      <Circle
        x={17}
        y={-15}
        radius={4.5}
        fill={offline ? CANVAS_COLORS.offline : CANVAS_COLORS.active}
        stroke="#fff"
        strokeWidth={1.5}
      />
      <Label y={27} listening={false}>
        <Tag
          fill={CANVAS_COLORS.label}
          cornerRadius={3}
          pointerDirection="up"
          pointerWidth={8}
          pointerHeight={4}
        />
        <Text text={device.name} fontSize={11} padding={3} fill={CANVAS_COLORS.text} />
      </Label>
    </Group>
  );
});

function DeviceIcon({ type }: { type: string }) {
  const color = CANVAS_COLORS.device[type] ?? CANVAS_COLORS.device.OTHER;
  switch (type) {
    case 'SWITCH':
      return (
        <>
          <Rect x={-22} y={-12} width={44} height={24} cornerRadius={4} fill={color} />
          {[0, 1, 2, 3, 4].map((i) => (
            <Rect key={i} x={-17 + i * 7} y={2} width={5} height={5} fill="#fff" cornerRadius={1} />
          ))}
          <Line points={[-16, -5, 16, -5]} stroke="#fff" strokeWidth={1.5} opacity={0.6} />
        </>
      );
    case 'ROUTER':
      return (
        <>
          <Circle radius={16} fill={color} />
          <Line points={[-9, 0, 9, 0]} stroke="#fff" strokeWidth={2} />
          <Line points={[0, -9, 0, 9]} stroke="#fff" strokeWidth={2} />
          <Line points={[5, -4, 9, 0, 5, 4]} stroke="#fff" strokeWidth={2} />
          <Line points={[-5, -4, -9, 0, -5, 4]} stroke="#fff" strokeWidth={2} />
        </>
      );
    case 'HOST':
      return (
        <>
          <Rect x={-16} y={-14} width={32} height={22} cornerRadius={3} fill={color} />
          <Rect x={-13} y={-11} width={26} height={16} fill="#bae6fd" />
          <Rect x={-4} y={8} width={8} height={4} fill={color} />
          <Rect x={-9} y={12} width={18} height={3} cornerRadius={1} fill={color} />
        </>
      );
    default:
      return (
        <>
          <Rect x={-16} y={-16} width={32} height={32} cornerRadius={6} fill={color} />
          <Text
            text={type === 'ACCESS_POINT' ? 'AP' : '?'}
            x={-16}
            y={-16}
            width={32}
            height={32}
            align="center"
            verticalAlign="middle"
            fontStyle="bold"
            fontSize={13}
            fill="#fff"
          />
        </>
      );
  }
}
