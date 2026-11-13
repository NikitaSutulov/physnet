'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useDeferredValue, useMemo, useState } from 'react';
import type { FloorPlanResponse } from '@physnet/shared';
import { useFloorPlans } from '@/hooks/useFloorPlans';
import { errorMessage } from '@/services/api';

export function PlansCatalog() {
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search.trim());
  const {
    data: plans,
    isPending,
    error,
  } = useFloorPlans(deferredSearch ? { search: deferredSearch } : {});

  const groups = useMemo(() => {
    const map = new Map<string, FloorPlanResponse[]>();
    for (const plan of plans ?? []) {
      const list = map.get(plan.building) ?? [];
      list.push(plan);
      map.set(plan.building, list);
    }
    return [...map.entries()];
  }, [plans]);

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Плани приміщень</h1>
          <p className="mt-1 text-sm text-muted">
            Креслення будівель і поверхів для розміщення обладнання
          </p>
        </div>
        <div className="flex gap-2">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Пошук за назвою або будівлею"
            aria-label="Пошук планів"
            className="h-9 w-64 rounded-md border border-border bg-surface px-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
          />
          <Link
            href="/plans/new"
            className="inline-flex h-9 items-center rounded-md bg-accent px-4 text-sm font-medium text-white hover:bg-accent-strong"
          >
            Новий план
          </Link>
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
          {errorMessage(error, 'Не вдалося завантажити плани')}
        </p>
      )}

      {isPending && <CardsSkeleton />}

      {!isPending && !error && groups.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <p className="font-medium">
            {deferredSearch ? 'Нічого не знайдено' : 'Ще немає жодного плану'}
          </p>
          {!deferredSearch && (
            <p className="mt-1 text-sm text-muted">
              <Link href="/plans/new" className="text-accent hover:underline">
                Завантажте креслення
              </Link>
              , щоб почати розміщувати обладнання.
            </p>
          )}
        </div>
      )}

      {groups.map(([building, items]) => (
        <div key={building || '—'} className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold tracking-wide text-muted uppercase">
            {building || 'Без будівлі'}
          </h2>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((plan) => (
              <li key={plan.id}>
                <PlanCard plan={plan} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

function PlanCard({ plan }: { plan: FloorPlanResponse }) {
  return (
    <Link
      href={`/plans/${plan.id}`}
      className="group block overflow-hidden rounded-xl border border-border bg-surface transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-accent"
    >
      <div className="relative aspect-[4/3] bg-surface-muted">
        <Image
          src={plan.imageUrl}
          alt={plan.title}
          fill
          unoptimized
          sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-contain p-2"
        />
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2.5">
        <span className="truncate text-sm font-medium group-hover:text-accent">{plan.title}</span>
        <span className="shrink-0 rounded bg-surface-muted px-1.5 py-0.5 font-mono text-xs text-muted">
          пов. {plan.floorLevel}
        </span>
      </div>
    </Link>
  );
}

function CardsSkeleton() {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-hidden>
      {Array.from({ length: 4 }, (_, i) => (
        <li key={i} className="h-56 animate-pulse rounded-xl bg-surface-muted" />
      ))}
    </ul>
  );
}
