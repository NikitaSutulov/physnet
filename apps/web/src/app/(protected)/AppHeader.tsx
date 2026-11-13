'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { forceLogout } from '@/services/api';
import { useAuthStore } from '@/store/authStore';

const NAV = [
  { href: '/dashboard', label: 'Дашборд' },
  { href: '/plans', label: 'Плани' },
  { href: '/policies', label: 'Політики' },
];

export function AppHeader() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <span className="flex size-7 items-center justify-center rounded-md bg-accent font-mono text-xs font-bold text-white">
            PN
          </span>
          PhysNet
        </Link>
        <nav className="flex gap-1">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-md px-3 py-1.5 text-sm transition-colors ${active ? 'bg-surface-muted font-medium text-foreground' : 'text-muted hover:text-foreground'}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          {user && (
            <span className="hidden text-sm text-muted sm:inline">
              {user.firstName} {user.lastName}
              <span className="ml-2 rounded bg-surface-muted px-1.5 py-0.5 font-mono text-xs">
                {user.role}
              </span>
            </span>
          )}
          <Button variant="ghost" onClick={forceLogout}>
            Вийти
          </Button>
        </div>
      </div>
    </header>
  );
}
