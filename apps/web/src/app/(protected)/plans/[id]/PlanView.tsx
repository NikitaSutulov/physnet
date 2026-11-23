'use client';

import axios from 'axios';
import Link from 'next/link';
import { FloorSwitcher } from '@/components/plans/FloorSwitcher';
import { PlanWorkspace } from '@/components/topology/PlanWorkspace';
import { useFloorPlan } from '@/hooks/useFloorPlans';
import { errorMessage } from '@/services/api';
import { DeletePlanButton } from './DeletePlanButton';
import { EditPlanButton } from './EditPlanButton';

export function PlanView({ id }: { id: string }) {
  const { data: plan, isPending, error } = useFloorPlan(id);
  if (error) {
    const notFound = axios.isAxiosError(error) && [400, 404].includes(error.response?.status ?? 0);
    return (
      <div className="rounded-xl border border-border bg-surface p-8 text-center">
        <p className="font-medium">{notFound ? 'План не знайдено' : errorMessage(error)}</p>
        <Link href="/plans" className="mt-2 inline-block text-sm text-accent hover:underline">
          До каталогу планів
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100dvh-6.5rem)] min-h-[480px] flex-col gap-3">
      <div className="flex items-center gap-3">
        <Link href="/plans" className="text-sm text-muted hover:text-foreground">
          ← Плани
        </Link>
        {isPending ? (
          <span className="h-6 w-56 animate-pulse rounded bg-surface-muted" />
        ) : (
          <>
            <h1 className="truncate text-lg font-semibold">{plan.title}</h1>
            <span className="text-sm text-muted">
              {plan.building || 'Без будівлі'} · поверх {plan.floorLevel}
            </span>
            <FloorSwitcher plan={plan} />
            <span className="ml-auto font-mono text-xs text-muted">
              {plan.width}×{plan.height} px
            </span>
            <EditPlanButton plan={plan} />
            <DeletePlanButton planId={plan.id} title={plan.title} />
          </>
        )}
      </div>
      {plan && <PlanWorkspace key={plan.id} plan={plan} />}
    </div>
  );
}
