import { getTaskStatus } from '@/services/conversion';
import { useAppStore } from '@/store/useAppStore';
import { useEffect, useRef } from 'react';

export const usePolling = () => {
  const { taskId, step, updateProgress, completeTask, failTask } = useAppStore();
  const timerRef = useRef<number | null>(null);
  const failureCountRef = useRef(0);

  useEffect(() => {
    if (step !== 'PROCESSING' || !taskId) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      failureCountRef.current = 0;
      return;
    }

    timerRef.current = window.setInterval(async () => {
      try {
        const res = await getTaskStatus(taskId);
        const payload = res.data;

        failureCountRef.current = 0;
        updateProgress(Math.max(0, Math.min(100, payload.progress)));

        if (payload.status === 'COMPLETED') {
          const dxfUrl = payload.result?.dxfUrl;
          if (!dxfUrl) {
            failTask('Task completed but dxfUrl is missing.');
          } else {
            completeTask({
              dxfUrl,
              previewImgUrl: payload.result?.previewUrl || '',
              orderId: payload.taskId,
            });
          }
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          return;
        }

        if (payload.status === 'FAILED') {
          failTask(payload.error?.message || 'Task failed.');
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
        }
      } catch (err) {
        console.error(err);
        failureCountRef.current += 1;
        if (failureCountRef.current >= 3) {
          failTask('Network or backend error. Please retry.');
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
        }
      }
    }, 2000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [step, taskId, updateProgress, completeTask, failTask]);
};
