import axios, { AxiosError } from 'axios';
import type { ApiError } from '@physnet/shared';
import { API_URL } from '@/lib/config';
import { clearToken, getToken } from '@/lib/auth-cookie';
import { useAuthStore } from '@/store/authStore';

export const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    const isLogin = error.config?.url?.includes('/auth/login');
    if (error.response?.status === 401 && !isLogin) {
      forceLogout();
    }
    return Promise.reject(error);
  },
);

export function forceLogout(): void {
  clearToken();
  useAuthStore.getState().reset();
}

export function errorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError<ApiError>(error)) {
    const msg = error.response?.data?.message;
    if (Array.isArray(msg)) return msg.join(', ');
    if (msg) return msg;
    if (!error.response) return 'API is unreachable';
  }
  return fallback;
}
