import { create } from 'zustand';
import type { Camera, Size } from '@/lib/geometry';

interface CanvasState {
  camera: Camera;
  viewport: Size;
  gridVisible: boolean;
  gridStep: number;
  snapEnabled: boolean;
  keepCameraFor: string | null;
  setCamera: (camera: Camera) => void;
  setViewport: (viewport: Size) => void;
  toggleGrid: () => void;
  toggleSnap: () => void;
  setKeepCameraFor: (planId: string | null) => void;
}

export const useCanvasStore = create<CanvasState>((set) => ({
  camera: { scale: 1, x: 0, y: 0 },
  viewport: { width: 0, height: 0 },
  gridVisible: true,
  gridStep: 50,
  snapEnabled: true,
  keepCameraFor: null,
  setCamera: (camera) => set({ camera }),
  setViewport: (viewport) => set({ viewport }),
  toggleGrid: () => set((s) => ({ gridVisible: !s.gridVisible })),
  toggleSnap: () => set((s) => ({ snapEnabled: !s.snapEnabled })),
  setKeepCameraFor: (keepCameraFor) => set({ keepCameraFor }),
}));
