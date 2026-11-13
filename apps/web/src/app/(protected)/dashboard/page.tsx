import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Дашборд' };

export default function DashboardPage() {
  return (
    <section>
      <h1 className="text-2xl font-semibold">Дашборд</h1>
      <p className="mt-2 text-sm text-muted">
        Статистика мережі та каталог планів з’являться на наступних етапах.
      </p>
    </section>
  );
}
