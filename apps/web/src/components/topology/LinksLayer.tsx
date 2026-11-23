'use client';

import { memo } from 'react';
import { Layer, Line } from 'react-konva';
import type { TopologyLink } from '@physnet/shared';
import type { Point } from '@/lib/geometry';
import { linkPoints } from '@/lib/topology';
import { CANVAS_COLORS } from './canvasTheme';

interface LinksLayerProps {
  links: TopologyLink[];
  positions: ReadonlyMap<string, Point>;
}

export const LinksLayer = memo(function LinksLayer({ links, positions }: LinksLayerProps) {
  return (
    <Layer listening={false}>
      {links.map((link) => {
        const points = linkPoints(link, positions);
        if (!points) return null;
        const down = link.status === 'DOWN';
        return (
          <Line
            key={link.id}
            points={points}
            stroke={down ? CANVAS_COLORS.linkDown : CANVAS_COLORS.linkActive}
            strokeWidth={link.cableType === 'OPTICAL' ? 3 : 2}
            dash={down ? [8, 6] : undefined}
            strokeScaleEnabled={false}
            lineJoin="round"
            lineCap="round"
            opacity={0.85}
            perfectDrawEnabled={false}
          />
        );
      })}
    </Layer>
  );
});
