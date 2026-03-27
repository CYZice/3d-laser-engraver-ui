import { getTaskStatus } from '@/services/conversion';
import { useAppStore } from '@/store/useAppStore';
import { message } from 'antd';
import { useEffect, useRef } from 'react';

export const usePolling = () => {
  const { taskId, step, updateProgress, completeTask, failTask } = useAppStore();
  const timerRef = useRef<number | null>(null);
  const failureCountRef = useRef(0);

  const simplifyError = (raw?: string): string => {
    if (!raw) return '任务失败。';
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

    return lines[0] || '任务失败。';
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
            failTask('任务已完成，但缺少 dxfUrl。');
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
          message.error(`处理失败：${errMsg}`);
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
        }
      } catch (err) {
        console.error(err);
        failureCountRef.current += 1;
        if (failureCountRef.current >= 3) {
          const errMsg = '网络或后端异常，请重试。';
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
