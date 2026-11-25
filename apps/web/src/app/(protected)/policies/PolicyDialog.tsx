'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useId, useMemo, type ReactNode } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import {
  INTENT_TYPES,
  IP_PROTOCOLS,
  type NetworkDeviceWithPorts,
  type RoutingPolicyResponse,
} from '@physnet/shared';
import { Button } from '@/components/ui/Button';
import { FormError } from '@/components/ui/ConfirmDialog';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useDevices } from '@/hooks/useDevices';
import { useSavePolicy } from '@/hooks/usePolicies';
import { INTENT_TYPE_LABELS } from '@/lib/format';
import {
  policyFormSchema,
  toFormInput,
  toPolicyRequest,
  type PolicyFormInput,
  type PolicyFormValues,
} from '@/lib/policyForm';
import { errorMessage } from '@/services/api';

interface Props {
  policy: RoutingPolicyResponse | null | undefined;
  onClose: () => void;
}

export function PolicyDialog({ policy, onClose }: Props) {
  const open = policy !== undefined;
  return (
    <Modal
      open={open}
      title={policy ? 'Редагувати політику' : 'Нова політика'}
      onClose={onClose}
      wide
    >
      {open && <PolicyForm key={policy?.id ?? 'new'} policy={policy} onDone={onClose} />}
    </Modal>
  );
}

const selectCls =
  'h-10 w-full rounded-md border border-border bg-surface px-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/25 aria-[invalid=true]:border-danger';

function PolicyForm({
  policy,
  onDone,
}: {
  policy: RoutingPolicyResponse | null;
  onDone: () => void;
}) {
  const save = useSavePolicy();
  const { data: devices } = useDevices({});
  const hosts = useMemo(() => (devices ?? []).filter((d) => d.deviceType === 'HOST'), [devices]);
  const switches = useMemo(
    () => (devices ?? []).filter((d) => d.deviceType !== 'HOST' && d.ports.length > 0),
    [devices],
  );

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<PolicyFormInput, unknown, PolicyFormValues>({
    resolver: zodResolver(policyFormSchema),
    defaultValues: toFormInput(policy ?? undefined),
  });
  const [type, ingressDevice, egressDevice, protocol] = useWatch({
    control,
    name: ['type', 'ingressDevice', 'egressDevice', 'protocol'],
  });
  const portsOf = (onosId: string) => switches.find((d) => d.onosDeviceId === onosId)?.ports ?? [];

  const onSubmit = handleSubmit((values) =>
    save.mutate({ id: policy?.id, body: toPolicyRequest(values) }, { onSuccess: onDone }),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <Input
        label="Назва"
        placeholder="Доступ сервера до шлюзу"
        error={errors.name?.message}
        {...register('name')}
      />

      <fieldset>
        <legend className="mb-1.5 text-sm font-medium">Тип intent</legend>
        <div className="flex gap-2">
          {INTENT_TYPES.map((t) => (
            <label
              key={t}
              className="flex h-9 flex-1 cursor-pointer items-center justify-center rounded-md border border-border text-sm transition-colors hover:bg-surface-muted has-checked:border-accent has-checked:bg-accent/10 has-checked:text-accent"
            >
              <input type="radio" value={t} className="sr-only" {...register('type')} />
              {INTENT_TYPE_LABELS[t]}
            </label>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-muted">
          {type === 'HostToHostIntent'
            ? 'Двосторонній зв’язок між двома хостами; ONOS сам прокладає шлях.'
            : 'Однонапрямлене пересилання трафіку з одного порту комутатора на інший.'}
        </p>
      </fieldset>

      {type === 'HostToHostIntent' ? (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Хост A" error={errors.one?.message}>
            {(id) => (
              <select
                id={id}
                className={selectCls}
                aria-invalid={!!errors.one}
                {...register('one', { deps: ['two'] })}
              >
                <option value="">—</option>
                <DeviceOptions devices={hosts} />
              </select>
            )}
          </Field>
          <Field label="Хост B" error={errors.two?.message}>
            {(id) => (
              <select
                id={id}
                className={selectCls}
                aria-invalid={!!errors.two}
                {...register('two')}
              >
                <option value="">—</option>
                <DeviceOptions devices={hosts} />
              </select>
            )}
          </Field>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-[1fr_6rem] gap-3">
            <Field label="Вхід: комутатор" error={errors.ingressDevice?.message}>
              {(id) => (
                <select
                  id={id}
                  className={selectCls}
                  aria-invalid={!!errors.ingressDevice}
                  {...register('ingressDevice')}
                >
                  <option value="">—</option>
                  <DeviceOptions devices={switches} />
                </select>
              )}
            </Field>
            <Field label="порт" error={errors.ingressPort?.message}>
              {(id) => (
                <select
                  id={id}
                  className={selectCls}
                  aria-invalid={!!errors.ingressPort}
                  {...register('ingressPort', { deps: ['egressPort'] })}
                >
                  <option value="">—</option>
                  {portsOf(ingressDevice).map((p) => (
                    <option key={p.id} value={p.portNumber}>
                      {p.portNumber}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <Field label="Вихід: комутатор" error={errors.egressDevice?.message}>
              {(id) => (
                <select
                  id={id}
                  className={selectCls}
                  aria-invalid={!!errors.egressDevice}
                  {...register('egressDevice')}
                >
                  <option value="">—</option>
                  <DeviceOptions devices={switches} />
                </select>
              )}
            </Field>
            <Field label="порт" error={errors.egressPort?.message}>
              {(id) => (
                <select
                  id={id}
                  className={selectCls}
                  aria-invalid={!!errors.egressPort}
                  {...register('egressPort')}
                >
                  <option value="">—</option>
                  {portsOf(egressDevice).map((p) => (
                    <option key={p.id} value={p.portNumber}>
                      {p.portNumber}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          </div>

          <fieldset className="rounded-md border border-border p-3">
            <legend className="px-1 text-sm font-medium">Трафік</legend>
            <p className="mb-3 text-xs text-muted">Порожні поля — увесь трафік.</p>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="IP джерела"
                placeholder="10.0.0.1"
                error={errors.ipSrc?.message}
                {...register('ipSrc')}
              />
              <Input
                label="IP призначення"
                placeholder="10.0.0.0/24"
                error={errors.ipDst?.message}
                {...register('ipDst')}
              />
              <Field label="Протокол">
                {(id) => (
                  <select
                    id={id}
                    className={selectCls}
                    {...register('protocol', { deps: ['dstPort'] })}
                  >
                    <option value="">Будь-який</option>
                    {IP_PROTOCOLS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
              <Input
                label="Порт призначення"
                inputMode="numeric"
                placeholder={protocol === 'TCP' || protocol === 'UDP' ? '80' : 'лише TCP/UDP'}
                error={errors.dstPort?.message}
                {...register('dstPort')}
              />
            </div>
          </fieldset>
        </>
      )}

      <div className="w-32">
        <Input
          label="Пріоритет"
          type="number"
          min={1}
          max={65535}
          error={errors.priority?.message}
          {...register('priority')}
        />
      </div>

      {save.isError && (
        <FormError message={errorMessage(save.error, 'Не вдалося зберегти політику')} />
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onDone} disabled={save.isPending}>
          Скасувати
        </Button>
        <Button type="submit" loading={save.isPending}>
          Зберегти
        </Button>
      </div>
    </form>
  );
}

function DeviceOptions({ devices }: { devices: NetworkDeviceWithPorts[] }) {
  return devices.map((d) => (
    <option key={d.id} value={d.onosDeviceId}>
      {d.name}
      {d.status !== 'ACTIVE' ? ' (недоступний)' : ''}
    </option>
  ));
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: (id: string) => ReactNode;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children(id)}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
