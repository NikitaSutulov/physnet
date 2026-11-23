'use client';

import type { KonvaEventObject } from 'konva/lib/Node';
import { memo } from 'react';
import { Layer, Line } from 'react-konva';
import type { TopologyLink } from '@physnet/shared';
import type { Point } from '@/lib/geometry';
import { linkPoints } from '@/lib/topology';
import { CANVAS_COLORS } from './canvasTheme';
import type { WaypointDraft } from './selection';

interface LinksLayerProps {
  links: TopologyLink[];
  positions: ReadonlyMap<string, Point>;
  selectedId: string | null;
  draft: WaypointDraft | null;
  onSelect: (linkId: string) => void;
  onClickSelected: (link: TopologyLink, point: Point) => void;
}

export const LinksLayer = memo(function LinksLayer({
  links,
  positions,
  selectedId,
  draft,
  onSelect,
  onClickSelected,
}: LinksLayerProps) {
  const setCursor = (e: KonvaEventObject<MouseEvent>, cursor: string) => {
    const stage = e.target.getStage();
    if (stage) stage.container().style.cursor = cursor;
  };

  return (
    <Layer>
      {links.map((link) => {
        const shown = draft?.linkId === link.id ? { ...link, waypoints: draft.waypoints } : link;
        const points = linkPoints(shown, positions);
        if (!points) return null;
        const down = link.status === 'DOWN';
        const selected = link.id === selectedId;
        const color = down ? CANVAS_COLORS.linkDown : CANVAS_COLORS.linkActive;
        return (
          <Line
            key={link.id}
            points={points}
            stroke={color}
            strokeWidth={(link.cableType === 'OPTICAL' ? 3 : 2) + (selected ? 2 : 0)}
            hitStrokeWidth={14}
            dash={down ? [8, 6] : undefined}
            strokeScaleEnabled={false}
            lineJoin="round"
            lineCap="round"
            opacity={selected ? 1 : 0.85}
            shadowColor={color}
            shadowBlur={selected ? 8 : 0}
            shadowEnabled={selected}
            perfectDrawEnabled={false}
            onMouseEnter={(e) => setCursor(e, selected ? 'copy' : 'pointer')}
            onMouseLeave={(e) => setCursor(e, 'grab')}
            onMouseDown={(e) => {
              e.cancelBubble = true;
            }}
            onClick={(e) => {
              e.cancelBubble = true;
              if (e.evt.button !== 0) return;
              const point = e.target.getStage()?.getRelativePointerPosition();
              if (selected && point) onClickSelected(link, point);
              else onSelect(link.id);
            }}
            onTap={() => onSelect(link.id)}
          />
        );
      })}
    </Layer>
  );
});
