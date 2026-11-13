import Cookies from 'js-cookie';
import { TOKEN_COOKIE } from './config';

export function getToken(): string | undefined {
  return Cookies.get(TOKEN_COOKIE);
}

export function setToken(token: string, expiresAt: string): void {
  Cookies.set(TOKEN_COOKIE, token, {
    expires: new Date(expiresAt),
    sameSite: 'strict',
    secure: window.location.protocol === 'https:',
    path: '/',
  });
}

export function clearToken(): void {
  Cookies.remove(TOKEN_COOKIE, { path: '/' });
}
