'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import axios from 'axios';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { setToken } from '@/lib/auth-cookie';
import { errorMessage } from '@/services/api';
import { login } from '@/services/auth';
import { useAuthStore } from '@/store/authStore';

const schema = z.object({
  email: z.email('Введіть коректну електронну адресу'),
  password: z.string().min(8, 'Пароль має містити щонайменше 8 символів'),
});

type FormValues = z.infer<typeof schema>;

function safeNext(next: string | null): string {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const res = await login(values);
      setToken(res.accessToken, res.expiresAt);
      useAuthStore.getState().setUser(res.user);
      router.replace(safeNext(searchParams.get('next')));
      router.refresh();
    } catch (e) {
      setFormError(
        axios.isAxiosError(e) && e.response?.status === 401
          ? 'Невірна електронна адреса або пароль'
          : errorMessage(e, 'Не вдалося увійти'),
      );
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <Input
        label="Електронна пошта"
        type="email"
        autoComplete="email"
        placeholder="admin@physnet.local"
        error={errors.email?.message}
        {...register('email')}
      />
      <Input
        label="Пароль"
        type="password"
        autoComplete="current-password"
        error={errors.password?.message}
        {...register('password')}
      />
      {formError && (
        <p role="alert" className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
          {formError}
        </p>
      )}
      <Button type="submit" loading={isSubmitting} className="mt-2 h-10">
        Увійти
      </Button>
    </form>
  );
}
