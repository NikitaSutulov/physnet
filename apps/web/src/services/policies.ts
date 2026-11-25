import type {
  CreatePolicyRequest,
  RoutingPolicyResponse,
  UpdatePolicyRequest,
} from '@physnet/shared';
import { api } from './api';

export async function listPolicies(): Promise<RoutingPolicyResponse[]> {
  const { data } = await api.get<RoutingPolicyResponse[]>('/policies');
  return data;
}

export async function createPolicy(body: CreatePolicyRequest): Promise<RoutingPolicyResponse> {
  const { data } = await api.post<RoutingPolicyResponse>('/policies', body);
  return data;
}

export async function updatePolicy(
  id: string,
  body: UpdatePolicyRequest,
): Promise<RoutingPolicyResponse> {
  const { data } = await api.patch<RoutingPolicyResponse>(`/policies/${id}`, body);
  return data;
}

export async function deletePolicy(id: string): Promise<void> {
  await api.delete(`/policies/${id}`);
}

export async function applyPolicy(id: string): Promise<RoutingPolicyResponse> {
  const { data } = await api.post<RoutingPolicyResponse>(`/policies/${id}/apply`);
  return data;
}

export async function withdrawPolicy(id: string): Promise<RoutingPolicyResponse> {
  const { data } = await api.post<RoutingPolicyResponse>(`/policies/${id}/withdraw`);
  return data;
}
