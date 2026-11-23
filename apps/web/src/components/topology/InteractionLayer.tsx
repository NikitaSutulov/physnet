'use client';

import type Konva from 'konva';
import { useEffect, useRef } from 'react';
import { Layer, Transformer } from 'react-konva';
import type { PlacedDevice } from '@physnet/shared';
import { deviceBodyId } from './DeviceNode';

interface InteractionLayerProps {
  selected: PlacedDevice | null;
  onRotate: (device: PlacedDevice, rotation: number) => void;
}

const ROTATION_SNAPS = Array.from({ length: 8 }, (_, i) => i * 45);

export function InteractionLayer({ selected, onRotate }: InteractionLayerProps) {
  const transformerRef = useRef<Konva.Transformer>(null);

  const position = selected?.position;
  useEffect(() => {
    const transformer = transformerRef.current;
    if (!transformer) return;
    const body = selected
      ? transformer.getStage()?.findOne<Konva.Group>(`#${deviceBodyId(selected.id)}`)
      : undefined;
    transformer.nodes(body ? [body] : []);
    transformer.getLayer()?.batchDraw();
  }, [selected, position]);

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
        borderStroke="#0e7490"
        anchorStroke="#0e7490"
        anchorCornerRadius={6}
        onTransformEnd={(e) => {
          if (selected) onRotate(selected, e.target.rotation());
        }}
      />
    </Layer>
  );
}
