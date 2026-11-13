'use client';

import { useBuildings } from '@/hooks/useFloorPlans';

export function BuildingsDatalist({ id }: { id: string }) {
  const { data: buildings } = useBuildings();
  return (
    <datalist id={id}>
      {buildings
        ?.filter((b) => b.building)
        .map((b) => (
          <option key={b.building} value={b.building} />
        ))}
    </datalist>
  );
}
