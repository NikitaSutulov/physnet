'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useId, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { FloorPlanResponse } from '@physnet/shared';
import { BuildingsDatalist } from '@/components/plans/BuildingsDatalist';
import { Button } from '@/components/ui/Button';
import { FormError } from '@/components/ui/ConfirmDialog';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useUpdateFloorPlan } from '@/hooks/useFloorPlans';
import {
  floorPlanMetaSchema,
  type FloorPlanMetaInput,
  type FloorPlanMetaValues,
} from '@/lib/floorPlanForm';
import { errorMessage } from '@/services/api';

type EditablePlan = Pick<FloorPlanResponse, 'id' | 'title' | 'building' | 'floorLevel'>;

export function EditPlanButton({ plan }: { plan: EditablePlan }) {
  const buildingsListId = useId();
  const [open, setOpen] = useState(false);
  const update = useUpdateFloorPlan(plan.id);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<FloorPlanMetaInput, unknown, FloorPlanMetaValues>({
    resolver: zodResolver(floorPlanMetaSchema),
  });

  const openForm = () => {
    reset({ title: plan.title, building: plan.building, floorLevel: plan.floorLevel });
    update.reset();
    setOpen(true);
  };

  const onSubmit = handleSubmit((values) =>
    update.mutate(values, { onSuccess: () => setOpen(false) }),
  );

  return (
    <>
      <Button variant="ghost" onClick={openForm}>
        Редагувати
      </Button>
      <Modal
        open={open}
        title="Редагувати план"
        onClose={() => setOpen(false)}
        locked={update.isPending}
      >
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <Input label="Назва" error={errors.title?.message} {...register('title')} />
          <div className="grid grid-cols-[1fr_7rem] gap-3">
            <Input
              label="Будівля"
              list={buildingsListId}
              error={errors.building?.message}
              {...register('building')}
            />
            <Input
              label="Поверх"
              type="number"
              step={1}
              error={errors.floorLevel?.message}
              {...register('floorLevel')}
            />
          </div>
          <BuildingsDatalist id={buildingsListId} />
          {update.isError && (
            <FormError message={errorMessage(update.error, 'Не вдалося зберегти зміни')} />
          )}
          <div className="mt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOpen(false)}
              disabled={update.isPending}
            >
              Скасувати
            </Button>
            <Button type="submit" loading={update.isPending} disabled={!isDirty}>
              Зберегти
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
