import type { AdminRole, Administrator } from './entities.ts';

export interface JwtPayload {
  sub: string;
  email: string;
  role: AdminRole;
  iat?: number;
  exp?: number;
}

export type AuthUser = Omit<Administrator, 'passwordHash'>;

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  expiresAt: string;
  user: AuthUser;
}

export interface ApiError {
  statusCode: number;
  error: string;
  message: string | string[];
  path: string;
  timestamp: string;
}
