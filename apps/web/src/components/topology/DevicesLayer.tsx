'use client';

import { Layer } from 'react-konva';
import type { PlacedDevice } from '@physnet/shared';
import type { Camera, Point, Size } from '@/lib/geometry';
import { DeviceNode } from './DeviceNode';

interface DevicesLayerProps {
  devices: PlacedDevice[];
  camera: Camera;
  plan: Size;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDragMove: (id: string, point: Point) => void;
  onDragEnd: (device: PlacedDevice, point: Point) => Point;
}

export function DevicesLayer({ devices, selectedId, ...rest }: DevicesLayerProps) {
  return (
    <Layer>
      {devices.map((d) => (
        <DeviceNode key={d.id} device={d} selected={d.id === selectedId} {...rest} />
      ))}
    </Layer>
  );
}
