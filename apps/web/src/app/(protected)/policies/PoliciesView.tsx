'use client';

import { useMemo, useState } from 'react';
import type { IntentState, RoutingPolicyResponse } from '@physnet/shared';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useDevices } from '@/hooks/useDevices';
import { useDeletePolicy, usePolicies, useTogglePolicy } from '@/hooks/usePolicies';
import { INTENT_TYPE_LABELS } from '@/lib/format';
import { errorMessage } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { PolicyDialog } from './PolicyDialog';

const STATE: Record<IntentState, { label: string; cls: string }> = {
  INSTALLED: { label: 'Встановлено', cls: 'bg-success/10 text-success' },
  INSTALLING: { label: 'Встановлюється…', cls: 'bg-amber-500/10 text-amber-600' },
  COMPILING: { label: 'Компілюється…', cls: 'bg-amber-500/10 text-amber-600' },
  RECOMPILING: { label: 'Перекомпілюється…', cls: 'bg-amber-500/10 text-amber-600' },
  WITHDRAWING: { label: 'Відкликається…', cls: 'bg-amber-500/10 text-amber-600' },
  WITHDRAWN: { label: 'Відкликано', cls: 'bg-surface-muted text-muted' },
  FAILED: { label: 'Помилка', cls: 'bg-danger/10 text-danger' },
  CORRUPT: { label: 'Пошкоджено', cls: 'bg-danger/10 text-danger' },
  NOT_APPLIED: { label: 'Не застосовано', cls: 'bg-surface-muted text-muted' },
  MISSING: { label: 'Немає в ONOS', cls: 'bg-danger/10 text-danger' },
  UNKNOWN: { label: 'Невідомо', cls: 'bg-surface-muted text-muted' },
};

export function PoliciesView() {
  const { data: policies, isPending, error } = usePolicies();
  const { data: devices } = useDevices({});
  const isAdmin = useAuthStore((s) => s.user?.role === 'ADMIN');
  const toggle = useTogglePolicy();
  const remove = useDeletePolicy();
  const [editing, setEditing] = useState<RoutingPolicyResponse | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<RoutingPolicyResponse | null>(null);

  const names = useMemo(
    () => new Map((devices ?? []).map((d) => [d.onosDeviceId, d.name])),
    [devices],
  );
  const name = (onosId: string) => names.get(onosId) ?? onosId;

  const summary = (p: RoutingPolicyResponse): string => {
    const pl = p.payload;
    if (pl.type === 'HostToHostIntent') return `${name(pl.one)} ↔ ${name(pl.two)}`;
    const s = pl.selector;
    const traffic = [
      s?.ipSrc && `з ${s.ipSrc}`,
      s?.ipDst && `до ${s.ipDst}`,
      s?.protocol && (s.dstPort ? `${s.protocol}/${s.dstPort}` : s.protocol),
    ].filter(Boolean);
    return `${name(pl.ingressPoint.device)}/${pl.ingressPoint.port} → ${name(pl.egressPoint.device)}/${pl.egressPoint.port}${
      traffic.length ? ` · ${traffic.join(', ')}` : ''
    }`;
  };

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Політики маршрутизації</h1>
          <p className="mt-1 text-sm text-muted">
            Шаблони intent для ONOS: застосована політика встановлюється в мережу
          </p>
        </div>
        {isAdmin && <Button onClick={() => setEditing(null)}>Нова політика</Button>}
      </div>

      {(error ?? toggle.error) && (
        <p role="alert" className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
          {errorMessage(error ?? toggle.error, 'Не вдалося виконати дію')}
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border text-xs text-muted uppercase">
            <tr>
              <th className="px-4 py-2.5 font-medium">Політика</th>
              <th className="px-4 py-2.5 font-medium">Тип</th>
              <th className="px-4 py-2.5 font-medium">Пріоритет</th>
              <th className="px-4 py-2.5 font-medium">Стан в ONOS</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {isPending && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted">
                  Завантаження…
                </td>
              </tr>
            )}
            {policies?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted">
                  Політик ще немає.
                  {isAdmin && ' Створіть першу, щоб керувати маршрутами в мережі.'}
                </td>
              </tr>
            )}
            {policies?.map((p) => {
              const state = STATE[p.state];
              const busy = toggle.isPending && toggle.variables?.id === p.id;
              return (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5">
                    <span className="block font-medium">{p.name}</span>
                    <span className="block text-xs text-muted">{summary(p)}</span>
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    {INTENT_TYPE_LABELS[p.intentType]}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums">{p.payload.priority}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${state.cls}`}
                      title={
                        p.state === 'UNKNOWN'
                          ? 'Контролер ONOS недоступний'
                          : p.intentKey
                            ? `Ключ intent: ${p.intentKey}`
                            : undefined
                      }
                    >
                      {state.label}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right whitespace-nowrap">
                    {isAdmin && (
                      <div className="flex items-center justify-end gap-3">
                        <Button
                          variant={p.isApplied ? 'secondary' : 'primary'}
                          loading={busy}
                          onClick={() => toggle.mutate(p)}
                        >
                          {p.isApplied ? 'Відкликати' : 'Застосувати'}
                        </Button>
                        <button
                          type="button"
                          disabled={p.isApplied}
                          title={p.isApplied ? 'Спершу відкличте політику' : undefined}
                          onClick={() => setEditing(p)}
                          className="px-1 text-sm text-accent hover:underline disabled:cursor-not-allowed disabled:text-muted disabled:no-underline"
                        >
                          Змінити
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            remove.reset();
                            setDeleting(p);
                          }}
                          className="px-1 text-sm text-danger hover:underline"
                        >
                          Видалити
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <PolicyDialog policy={editing} onClose={() => setEditing(undefined)} />
      <ConfirmDialog
        open={deleting !== null}
        title="Видалити політику"
        confirmLabel="Видалити"
        destructive
        loading={remove.isPending}
        error={remove.isError ? errorMessage(remove.error, 'Не вдалося видалити') : null}
        onCancel={() => setDeleting(null)}
        onConfirm={() =>
          deleting && remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })
        }
      >
        Політику <b className="text-foreground">{deleting?.name}</b> буде видалено
        {deleting?.isApplied ? ', а її intent — відкликано з ONOS' : ''}.
      </ConfirmDialog>
    </section>
  );
}
