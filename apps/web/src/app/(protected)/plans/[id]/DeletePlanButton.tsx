'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useDeleteFloorPlan } from '@/hooks/useFloorPlans';
import { errorMessage } from '@/services/api';
import { useAuthStore } from '@/store/authStore';

export function DeletePlanButton({ planId, title }: { planId: string; title: string }) {
  const router = useRouter();
  const isAdmin = useAuthStore((s) => s.user?.role === 'ADMIN');
  const [open, setOpen] = useState(false);
  const deletePlan = useDeleteFloorPlan();

  if (!isAdmin) return null;

  const confirm = () =>
    deletePlan.mutate(planId, {
      onSuccess: () => {
        setOpen(false);
        router.replace('/plans');
      },
    });

  return (
    <>
      <Button
        variant="ghost"
        className="text-danger hover:text-danger"
        onClick={() => setOpen(true)}
      >
        Видалити
      </Button>
      <ConfirmDialog
        open={open}
        title="Видалити план?"
        confirmLabel="Видалити"
        destructive
        loading={deletePlan.isPending}
        error={
          deletePlan.isError ? errorMessage(deletePlan.error, 'Не вдалося видалити план') : null
        }
        onConfirm={confirm}
        onCancel={() => {
          setOpen(false);
          deletePlan.reset();
        }}
      >
        <p>
          План <span className="font-medium text-foreground">«{title}»</span> буде видалено разом із
          зображенням, розміщенням пристроїв і прокладеними на ньому лініями зв’язку. Цю дію не
          можна скасувати.
        </p>
      </ConfirmDialog>
    </>
  );
}
