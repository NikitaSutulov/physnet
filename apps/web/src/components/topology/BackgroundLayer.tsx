'use client';

import { memo } from 'react';
import { Image as KonvaImage, Layer, Rect, Shape } from 'react-konva';

interface BackgroundLayerProps {
  image?: HTMLImageElement;
  width: number;
  height: number;
  scale: number;
  gridVisible: boolean;
  gridStep: number;
}

export const BackgroundLayer = memo(function BackgroundLayer({
  image,
  width,
  height,
  scale,
  gridVisible,
  gridStep,
}: BackgroundLayerProps) {
  return (
    <Layer listening={false}>
      <Rect
        width={width}
        height={height}
        fill="#ffffff"
        shadowColor="#000"
        shadowOpacity={0.15}
        shadowBlur={16 / scale}
        perfectDrawEnabled={false}
      />
      {image && (
        <KonvaImage image={image} width={width} height={height} perfectDrawEnabled={false} />
      )}
      {gridVisible && gridStep > 0 && (
        <Shape
          perfectDrawEnabled={false}
          sceneFunc={(ctx) => {
            ctx.beginPath();
            for (let x = gridStep; x < width; x += gridStep) {
              ctx.moveTo(x, 0);
              ctx.lineTo(x, height);
            }
            for (let y = gridStep; y < height; y += gridStep) {
              ctx.moveTo(0, y);
              ctx.lineTo(width, y);
            }
            ctx.lineWidth = 1 / scale;
            ctx.strokeStyle = 'rgba(14, 116, 144, 0.18)';
            ctx.stroke();
          }}
        />
      )}
    </Layer>
  );
});
