import { useAppStore } from '@/store/useAppStore';
import { useEffect, useRef } from 'react';
// import { getTaskStatus } from '@/services/conversion';

export const usePolling = () => {
  const { taskId, step, updateProgress, completeTask, failTask } = useAppStore();
  const timerRef = useRef<number | null>(null); // Use window.setInterval return type if needed, but number is usually fine in browser env if using window.

  useEffect(() => {
    if (step !== 'PROCESSING' || !taskId) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    // Mock Simulation Logic (Remove this block when real API is ready)
    // In real scenario, we poll the API
    let mockProgress = 0;

    // @ts-ignore
    timerRef.current = setInterval(async () => {
      // Real API Call:
      // const res = await getTaskStatus(taskId);
      // updateProgress(res.progress);
      // if (res.status === 'completed') completeTask(res.data!);
      // if (res.status === 'failed') failTask(res.error!);

      // Mock Implementation:
      mockProgress += 10;
      updateProgress(mockProgress);
      if (mockProgress >= 100) {
        completeTask({
          dxfUrl: '/output.dxf', // Changed to local real file!
          previewImgUrl: 'https://placehold.co/600x400?text=DXF+Preview', // Mock Image
          orderId: 'ORD-' + Math.floor(Math.random() * 10000).toString().padStart(4, '0')
        });
        if (timerRef.current) clearInterval(timerRef.current);
      }
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [step, taskId, updateProgress, completeTask, failTask]);
};
