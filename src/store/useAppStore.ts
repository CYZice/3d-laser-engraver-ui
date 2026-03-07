import { create } from 'zustand';

export type AppStep = 'ATTRACT' | 'CAPTURE' | 'UPLOAD' | 'EDIT' | 'PAYMENT' | 'PROCESSING' | 'RESULT';

export interface TaskResult {
  dxfUrl: string;
  previewImgUrl: string;
  orderId?: string;
}

interface AppState {
  step: AppStep;
  originalFile: File | null;
  previewUrl: string | null;
  taskId: string | null;
  progress: number;
  result: TaskResult | null;
  error: string | null;
  orderId: string | null;

  setStep: (step: AppStep) => void;
  setFile: (file: File) => void;
  setOrderId: (id: string) => void;
  startTask: (taskId: string) => void;
  updateProgress: (progress: number) => void;
  completeTask: (result: TaskResult) => void;
  failTask: (error: string) => void;
  reset: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  step: 'ATTRACT',
  originalFile: null,
  previewUrl: null,
  taskId: null,
  progress: 0,
  result: null,
  error: null,
  orderId: null,

  setStep: (step) => set({ step }),
  setFile: (file) => {
    const url = URL.createObjectURL(file);
    set({ originalFile: file, previewUrl: url, step: 'EDIT', error: null });
  },
  setOrderId: (orderId) => set({ orderId }),
  startTask: (taskId) => set({ taskId, step: 'PROCESSING', progress: 0, error: null }),
  updateProgress: (progress) => set({ progress }),
  completeTask: (result) => set({
    result,
    step: 'RESULT',
    progress: 100,
    orderId: result.orderId || null
  }),
  failTask: (error) => set({ error, step: 'EDIT' }), // Go back to edit on fail
  reset: () => set({
    step: 'ATTRACT',
    originalFile: null,
    previewUrl: null,
    taskId: null,
    progress: 0,
    result: null,
    error: null,
    orderId: null
  }),
}));
