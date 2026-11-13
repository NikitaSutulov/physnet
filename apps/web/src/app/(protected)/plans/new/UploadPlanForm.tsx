'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useState, type DragEvent } from 'react';
import { useForm } from 'react-hook-form';
import { FLOOR_PLAN_MAX_BYTES, FLOOR_PLAN_MIME_TYPES } from '@physnet/shared';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { BuildingsDatalist } from '@/components/plans/BuildingsDatalist';
import { useCreateFloorPlan } from '@/hooks/useFloorPlans';
import {
  floorPlanMetaSchema,
  type FloorPlanMetaInput,
  type FloorPlanMetaValues,
} from '@/lib/floorPlanForm';
import { errorMessage } from '@/services/api';

function validateFile(file: File): string | null {
  if (!(FLOOR_PLAN_MIME_TYPES as readonly string[]).includes(file.type)) {
    return 'Підтримуються лише PNG, JPEG, WEBP або SVG';
  }
  if (file.size > FLOOR_PLAN_MAX_BYTES) return 'Файл більший за 20 МБ';
  return null;
}

export function UploadPlanForm() {
  const router = useRouter();
  const buildingsListId = useId();
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState(0);

  const createPlan = useCreateFloorPlan(setProgress);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FloorPlanMetaInput, unknown, FloorPlanMetaValues>({
    resolver: zodResolver(floorPlanMetaSchema),
    defaultValues: { title: '', building: '', floorLevel: 1 },
  });

  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  const pickFile = (candidate: File | undefined) => {
    if (!candidate) return;
    const problem = validateFile(candidate);
    setFileError(problem);
    setFile(problem ? null : candidate);
    setPreview(problem ? null : URL.createObjectURL(candidate));
  };

  const onDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setDragOver(false);
    pickFile(e.dataTransfer.files[0]);
  };

  const onSubmit = handleSubmit(async (values) => {
    if (!file) {
      setFileError('Оберіть файл креслення');
      return;
    }
    setProgress(0);
    const plan = await createPlan.mutateAsync({ file, ...values });
    router.push(`/plans/${plan.id}`);
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`relative flex min-h-56 cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
          dragOver
            ? 'border-accent bg-accent/5'
            : fileError
              ? 'border-danger'
              : 'border-border bg-surface'
        }`}
      >
        <input
          type="file"
          accept={FLOOR_PLAN_MIME_TYPES.join(',')}
          className="sr-only"
          onChange={(e) => pickFile(e.target.files?.[0])}
        />
        {preview ? (
          <>
            <div className="relative h-48 w-full">
              <Image
                src={preview}
                alt="Попередній перегляд"
                fill
                unoptimized
                className="object-contain"
              />
            </div>
            <span className="text-sm text-muted">
              {file?.name} · {((file?.size ?? 0) / 1024 / 1024).toFixed(1)} МБ — натисніть, щоб
              замінити
            </span>
          </>
        ) : (
          <>
            <span className="font-medium">Перетягніть креслення сюди</span>
            <span className="text-sm text-muted">або натисніть, щоб обрати файл</span>
          </>
        )}
      </label>
      {fileError && <p className="-mt-3 text-xs text-danger">{fileError}</p>}

      <Input
        label="Назва"
        placeholder="Поверх 3, аудиторії 301–320"
        error={errors.title?.message}
        {...register('title')}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_9rem]">
        <Input
          label="Будівля"
          placeholder="Корпус 18"
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

      {createPlan.isError && (
        <p role="alert" className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
          {errorMessage(createPlan.error, 'Не вдалося завантажити план')}
        </p>
      )}

      {createPlan.isPending && (
        <div
          className="h-1.5 overflow-hidden rounded-full bg-surface-muted"
          role="progressbar"
          aria-valuenow={Math.round(progress * 100)}
        >
          <div
            className="h-full bg-accent transition-[width]"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          Скасувати
        </Button>
        <Button type="submit" loading={createPlan.isPending}>
          Завантажити
        </Button>
      </div>
    </form>
  );
}
