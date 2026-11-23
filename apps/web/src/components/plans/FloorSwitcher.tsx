'use client';

import Link from 'next/link';
import type { FloorPlan } from '@physnet/shared';
import { useBuildings } from '@/hooks/useFloorPlans';
import { useCanvasStore } from '@/store/canvasStore';

export function FloorSwitcher({ plan }: { plan: Pick<FloorPlan, 'id' | 'building'> }) {
  const { data: buildings } = useBuildings();
  const setKeepCameraFor = useCanvasStore((s) => s.setKeepCameraFor);
  const floors = buildings?.find((b) => b.building === plan.building)?.floors ?? [];
  if (!plan.building || floors.length < 2) return null;

  return (
    <nav aria-label="Поверхи будівлі" className="flex items-center gap-1">
      <span className="mr-1 text-xs text-muted">Поверх</span>
      {[...floors]
        .sort((a, b) => a.floorLevel - b.floorLevel)
        .map((f) => {
          const current = f.id === plan.id;
          return (
            <Link
              key={f.id}
              href={`/plans/${f.id}`}
              title={f.title}
              aria-current={current ? 'page' : undefined}
              onClick={() => !current && setKeepCameraFor(f.id)}
              className={`flex h-7 min-w-7 items-center justify-center rounded-md border px-2 text-sm tabular-nums transition-colors ${
                current
                  ? 'border-accent bg-accent text-white'
                  : 'border-border hover:border-accent hover:text-accent'
              }`}
            >
              {f.floorLevel}
            </Link>
          );
        })}
    </nav>
  );
}
