'use client';

import { useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { getToken } from '@/lib/auth-cookie';
import { decodeJwt, isTokenExpired } from '@/lib/jwt';
import { forceLogout } from '@/services/api';
import { fetchMe } from '@/services/auth';
import { useAuthStore } from '@/store/authStore';

export function AuthProvider({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const status = useAuthStore((s) => s.status);
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();

  useEffect(() => {
    const token = getToken();
    if (!token || isTokenExpired(token)) {
      useAuthStore.getState().reset();
      return;
    }
    if (useAuthStore.getState().user) return;

    useAuthStore.getState().setStatus('loading');
    fetchMe()
      .then((me) => useAuthStore.getState().setUser(me))
      .catch(() => useAuthStore.getState().reset());
  }, []);

  useEffect(() => {
    if (!user) return;
    const token = getToken();
    const exp = token ? decodeJwt(token)?.exp : undefined;
    if (!exp) return;
    const ms = exp * 1000 - Date.now();
    const timer = window.setTimeout(forceLogout, Math.max(ms, 0));
    return () => window.clearTimeout(timer);
  }, [user]);

  useEffect(() => {
    if (status !== 'anonymous' || pathname === '/login') return;
    queryClient.clear();
    const next = encodeURIComponent(pathname + window.location.search);
    router.replace(`/login?next=${next}`);
  }, [status, pathname, router, queryClient]);

  return children;
}
