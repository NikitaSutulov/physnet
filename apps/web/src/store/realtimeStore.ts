import { create } from 'zustand';

export type RealtimeStatus = 'offline' | 'connecting' | 'online';

interface RealtimeState {
  status: RealtimeStatus;
  setStatus: (status: RealtimeStatus) => void;
}

export const useRealtimeStore = create<RealtimeState>((set) => ({
  status: 'offline',
  setStatus: (status) => set({ status }),
}));
