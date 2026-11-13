import type { Metadata } from 'next';
import { UploadPlanForm } from './UploadPlanForm';

export const metadata: Metadata = { title: 'Новий план' };

export default function NewPlanPage() {
  return (
    <section className="mx-auto w-full max-w-2xl">
      <h1 className="text-2xl font-semibold">Новий план приміщення</h1>
      <p className="mt-1 mb-6 text-sm text-muted">
        PNG, JPEG, WEBP або SVG до 20 МБ. Розміри креслення визначаються автоматично.
      </p>
      <UploadPlanForm />
    </section>
  );
}
