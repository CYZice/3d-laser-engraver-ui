import { getTaskStatus } from '@/services/conversion';
import { useAppStore } from '@/store/useAppStore';
import { message } from 'antd';
import { useEffect, useRef } from 'react';

export const usePolling = () => {
  const { taskId, step, updateProgress, completeTask, failTask } = useAppStore();
  const timerRef = useRef<number | null>(null);
  const failureCountRef = useRef(0);

  const simplifyError = (raw?: string): string => {
    if (!raw) return 'Task failed.';
    const lines = raw
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    const moduleError = lines.find((line) =>
      line.includes('ModuleNotFoundError') || line.includes('ImportError')
    );
    if (moduleError) return moduleError;

    const tracebackHint = [...lines]
      .reverse()
      .find((line) => !line.startsWith('File "') && !line.startsWith('Traceback'));
    if (tracebackHint) return tracebackHint;

    return lines[0] || 'Task failed.';
  };

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
          const errMsg = simplifyError(payload.error?.message);
          failTask(errMsg);
          message.error(`Processing failed: ${errMsg}`);
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
        }
      } catch (err) {
        console.error(err);
        failureCountRef.current += 1;
        if (failureCountRef.current >= 3) {
          const errMsg = 'Network or backend error. Please retry.';
          failTask(errMsg);
          message.error(errMsg);
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
