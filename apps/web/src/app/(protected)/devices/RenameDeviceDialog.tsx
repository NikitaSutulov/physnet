'use client';

import { useState } from 'react';
import type { NetworkDeviceWithPorts } from '@physnet/shared';
import { Button } from '@/components/ui/Button';
import { FormError } from '@/components/ui/ConfirmDialog';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useRenameDevice } from '@/hooks/useDevices';
import { errorMessage } from '@/services/api';

interface Props {
  device: NetworkDeviceWithPorts | null;
  onClose: () => void;
}

export function RenameDeviceDialog({ device, onClose }: Props) {
  return (
    <Modal open={device !== null} title="Перейменувати пристрій" onClose={onClose}>
      {device && <RenameForm key={device.id} device={device} onDone={onClose} />}
    </Modal>
  );
}

function RenameForm({ device, onDone }: { device: NetworkDeviceWithPorts; onDone: () => void }) {
  const [name, setName] = useState(device.name);
  const rename = useRenameDevice();
  const trimmed = name.trim();

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (trimmed) rename.mutate({ id: device.id, name: trimmed }, { onSuccess: onDone });
      }}
    >
      <p className="font-mono text-xs text-muted">{device.onosDeviceId}</p>
      <Input
        label="Назва"
        name="name"
        value={name}
        maxLength={255}
        onChange={(e) => setName(e.target.value)}
        error={trimmed ? undefined : 'Вкажіть назву'}
        autoFocus
      />
      {rename.isError && (
        <FormError message={errorMessage(rename.error, 'Не вдалося перейменувати')} />
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onDone} disabled={rename.isPending}>
          Скасувати
        </Button>
        <Button
          type="submit"
          loading={rename.isPending}
          disabled={!trimmed || trimmed === device.name}
        >
          Зберегти
        </Button>
      </div>
    </form>
  );
}
