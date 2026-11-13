import { create } from 'zustand';
import type { Camera } from '@/lib/geometry';

interface CanvasState {
  camera: Camera;
  gridVisible: boolean;
  gridStep: number;
  setCamera: (camera: Camera) => void;
  toggleGrid: () => void;
}

export const useCanvasStore = create<CanvasState>((set) => ({
  camera: { scale: 1, x: 0, y: 0 },
  gridVisible: true,
  gridStep: 50,
  setCamera: (camera) => set({ camera }),
  toggleGrid: () => set((s) => ({ gridVisible: !s.gridVisible })),
}));
