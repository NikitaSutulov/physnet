import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LoginForm } from './LoginForm';

export const metadata: Metadata = { title: 'Вхід' };

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex size-11 items-center justify-center rounded-lg bg-accent font-mono text-lg font-bold text-white">
            PN
          </div>
          <h1 className="text-xl font-semibold">PhysNet</h1>
          <p className="mt-1 text-sm text-muted">Керування SDN-мережею на планах приміщень</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
