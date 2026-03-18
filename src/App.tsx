import { AttractScreen } from '@/components/AttractScreen';
import { CameraCapture } from '@/components/CameraCapture';
import { ImageEditor } from '@/components/ImageEditor';
import { ImageUploader } from '@/components/ImageUploader';
import { PaymentMock } from '@/components/PaymentMock';
import { ProcessingStatus } from '@/components/ProcessingStatus';
import { ResultTicket } from '@/components/ResultTicket';
import { useAppStore } from '@/store/useAppStore';
import { useEffect } from 'react';

function App() {
  const step = useAppStore((s) => s.step);
  const setStep = useAppStore((s) => s.setStep);
  const setFile = useAppStore((s) => s.setFile);
  const reset = useAppStore((s) => s.reset);
  const startTask = useAppStore((s) => s.startTask);
  const orderId = useAppStore((s) => s.orderId);
  const result = useAppStore((s) => s.result);

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
              onUploadSuccess={(taskId) => {
                startTask(taskId);
                setStep('PAYMENT');
              }}
            />
          </div>
        );

      case 'PAYMENT':
        return (
          <PaymentMock
            amount={29.9}
            onPaymentSuccess={() => {
              setStep('PROCESSING');
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
            orderId={orderId || 'Unknown'}
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
