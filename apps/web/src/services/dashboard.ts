import type { DashboardStats, SystemEvent } from '@physnet/shared';
import { api } from './api';

export async function getDashboardStats(): Promise<DashboardStats> {
  const { data } = await api.get<DashboardStats>('/dashboard/stats');
  return data;
}

export async function listEvents(limit: number): Promise<SystemEvent[]> {
  const { data } = await api.get<SystemEvent[]>('/events', { params: { limit } });
  return data;
}
