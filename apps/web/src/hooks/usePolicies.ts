import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreatePolicyRequest, IntentState, RoutingPolicyResponse } from '@physnet/shared';
import {
  applyPolicy,
  createPolicy,
  deletePolicy,
  listPolicies,
  updatePolicy,
  withdrawPolicy,
} from '@/services/policies';

export const policyKeys = { all: ['policies'] as const };

const TRANSITIONAL: readonly IntentState[] = [
  'INSTALLING',
  'COMPILING',
  'RECOMPILING',
  'WITHDRAWING',
];

export function usePolicies() {
  return useQuery({
    queryKey: policyKeys.all,
    queryFn: listPolicies,
    refetchInterval: (query) =>
      query.state.data?.some((p) => TRANSITIONAL.includes(p.state)) ? 2_000 : 15_000,
  });
}

function useInvalidate() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: policyKeys.all });
}

export function useSavePolicy() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, body }: { id?: string; body: CreatePolicyRequest }) =>
      id ? updatePolicy(id, body) : createPolicy(body),
    onSuccess: invalidate,
  });
}

export function useDeletePolicy() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: deletePolicy, onSettled: invalidate });
}

export function useTogglePolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (policy: RoutingPolicyResponse) =>
      policy.isApplied ? withdrawPolicy(policy.id) : applyPolicy(policy.id),
    onSuccess: (updated) =>
      queryClient.setQueryData<RoutingPolicyResponse[]>(policyKeys.all, (list) =>
        list?.map((p) => (p.id === updated.id ? updated : p)),
      ),
    onSettled: () => queryClient.invalidateQueries({ queryKey: policyKeys.all }),
  });
}
