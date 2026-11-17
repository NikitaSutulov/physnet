'use client';

import { useState } from 'react';
import type { OfflineDevicesSummary } from '@physnet/shared';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { usePurgeOfflineDevices } from '@/hooks/useDevices';
import { errorMessage } from '@/services/api';

interface Props {
  summary: OfflineDevicesSummary;
  onClose: (deleted?: number) => void;
}

export function PurgeOfflineDialog({ summary, onClose }: Props) {
  const [includePlaced, setIncludePlaced] = useState(false);
  const purge = usePurgeOfflineDevices();
  const count = includePlaced ? summary.total : summary.total - summary.placed;

  return (
    <ConfirmDialog
      open
      title="Очистити неактивні пристрої"
      confirmLabel={count > 0 ? `Видалити (${count})` : 'Видалити'}
      destructive
      loading={purge.isPending}
      confirmDisabled={count === 0}
      error={purge.isError ? errorMessage(purge.error, 'Не вдалося видалити пристрої') : null}
      onCancel={() => onClose()}
      onConfirm={() =>
        purge.mutate(includePlaced, { onSuccess: (result) => onClose(result.deleted) })
      }
    >
      <p>
        Пристрої, яких контролер ONOS більше не бачить, буде видалено разом з їхніми портами. Якщо
        пристрій з’явиться знову, синхронізація створить його заново.
      </p>
      {summary.placed > 0 && (
        <label className="mt-3 flex items-start gap-2 text-foreground">
          <input
            type="checkbox"
            checked={includePlaced}
            onChange={(e) => setIncludePlaced(e.target.checked)}
            className="mt-0.5 accent-danger"
          />
          <span>
            Також видалити розміщені на планах ({summary.placed})
            <span className="block text-xs text-muted">
              Їхні позиції та лінії зв’язку на планах теж буде видалено
            </span>
          </span>
        </label>
      )}
    </ConfirmDialog>
  );
}
