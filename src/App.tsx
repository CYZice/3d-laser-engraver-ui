import { AttractScreen } from '@/components/AttractScreen';
import { CameraCapture } from '@/components/CameraCapture';
import { ImageEditor } from '@/components/ImageEditor';
import { ImageUploader } from '@/components/ImageUploader';
import { PaymentMock } from '@/components/PaymentMock';
import { ProcessingStatus } from '@/components/ProcessingStatus';
import { ResultTicket } from '@/components/ResultTicket';
import { createTask } from '@/services/conversion';
import { useAppStore } from '@/store/useAppStore';
import { message } from 'antd';
import { useEffect } from 'react';

function App() {
  const step = useAppStore((s) => s.step);
  const setStep = useAppStore((s) => s.setStep);
  const setFile = useAppStore((s) => s.setFile);
  const setUploadId = useAppStore((s) => s.setUploadId);
  const reset = useAppStore((s) => s.reset);
  const startTask = useAppStore((s) => s.startTask);
  const uploadId = useAppStore((s) => s.uploadId);
  const originalFile = useAppStore((s) => s.originalFile);
  const orderId = useAppStore((s) => s.orderId);
  const result = useAppStore((s) => s.result);

  const params = new URLSearchParams(window.location.search);
  const debugDxf = params.get('debugDxf');
  const debugPreview = params.get('debugPreview') || '';

  if (debugDxf) {
    return (
      <ResultTicket
        orderId={'DEBUG'}
        onDone={reset}
        dxfUrl={debugDxf}
        fallbackImgUrl={debugPreview}
      />
    );
  }

  // Global Idle Timeout
  useEffect(() => {
    let timer: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(timer);
      if (step !== 'ATTRACT') {
        timer = setTimeout(() => {
          reset();
        }, 60000); // 60s timeout
      }
    };

    window.addEventListener('pointerdown', resetTimer);
    window.addEventListener('keydown', resetTimer);

    // Start timer on mount if not in ATTRACT
    if (step !== 'ATTRACT') {
      resetTimer();
    }

    return () => {
      clearTimeout(timer);
      window.removeEventListener('pointerdown', resetTimer);
      window.removeEventListener('keydown', resetTimer);
    };
  }, [step, reset]);

  const renderContent = () => {
    switch (step) {
      case 'ATTRACT':
        return <AttractScreen onStart={() => setStep('CAPTURE')} />;

      case 'CAPTURE':
        return (
          <CameraCapture
            onCapture={(file) => setFile(file)}
            onBack={() => setStep('ATTRACT')}
          />
        );

      case 'UPLOAD': // Fallback or Legacy
        return <ImageUploader />;

      case 'EDIT':
        return (
          <div style={{ padding: 20, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <ImageEditor
              onUploadSuccess={(uploadedId) => {
                setUploadId(uploadedId);
                setStep('PAYMENT');
              }}
            />
          </div>
        );

      case 'PAYMENT':
        return (
          <PaymentMock
            amount={29.9}
            onPaymentSuccess={async () => {
              if (!uploadId) {
                message.error('上传会话丢失，请重试。');
                setStep('EDIT');
                return;
              }

              try {
                const createRes = await createTask({
                  uploadId,
                  paymentToken: `pay_mock_${Date.now()}`,
                  faceIndex: 0,
                  options: {
                    modelVersion: 'mb1_120x120',
                    dxfResolution: 0.5,
                    pointDensity: 1.0,
                    gamma: 0.5,
                    shading: 'equalize',
                    method: 'jarvis',
                    blendAlpha: 0.4,
                    threshold: 0.5,
                  },
                });

                const taskId = createRes.data.taskId;
                startTask(taskId);
              } catch (err) {
                console.error(err);
                const tip = originalFile
                  ? '创建任务失败，请重新支付后再试。'
                  : '未找到源图像，请重新拍摄。';
                message.error(tip);
                setStep('EDIT');
              }
            }}
          />
        );

      case 'PROCESSING':
        return (
          <div style={{ padding: 20, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ProcessingStatus />
          </div>
        );

      case 'RESULT':
        return (
          <ResultTicket
            orderId={orderId || '未知'}
            onDone={reset}
            dxfUrl={result?.dxfUrl || ''}
            fallbackImgUrl={result?.previewImgUrl || ''}
          />
        );

      default:
        return <AttractScreen onStart={() => setStep('CAPTURE')} />;
    }
  };

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      background: '#000',
      position: 'relative'
    }}>
      {renderContent()}
    </div>
  );
}

export default App;
