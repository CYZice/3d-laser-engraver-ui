import { ArrowLeft, Camera, Check, RotateCcw } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import Webcam from 'react-webcam';

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onBack: () => void;
}

const videoConstraints = {
  width: 1080,
  height: 1920,
  facingMode: "user"
};

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onBack }) => {
  const webcamRef = useRef<Webcam>(null);
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [flash, setFlash] = useState(false);

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setFlash(true);
      setTimeout(() => setFlash(false), 200);
      setImgSrc(imageSrc);
    }
  }, [webcamRef]);

  const startCountdown = () => {
    setCountdown(3);
  };

  useEffect(() => {
    if (countdown === null) return;

    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCountdown(null);
      capture();
    }
  }, [countdown, capture]);

  const handleRetake = () => {
    setImgSrc(null);
  };

  const handleConfirm = () => {
    if (imgSrc) {
      // Convert base64 to File
      fetch(imgSrc)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
          onCapture(file);
        });
    }
  };

  return (
    <div style={{
      width: '100%',
      height: '100vh',
      background: '#000',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>

      {/* Top Bar */}
      <div style={{
        position: 'absolute',
        top: 20,
        left: 20,
        zIndex: 20
      }}>
        <button
          onClick={onBack}
          className="glass-panel"
          style={{
            width: 50,
            height: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--primary-cyan)',
            cursor: 'pointer',
            background: 'rgba(0,0,0,0.5)',
            border: '1px solid var(--primary-cyan)'
          }}
        >
          <ArrowLeft size={24} />
        </button>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {imgSrc ? (
          <img
            src={imgSrc}
            alt="拍摄预览"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: 'scaleX(-1)' // Mirror effect to match webcam
            }}
          />
        ) : (
          <Webcam
            audio={false}
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            videoConstraints={videoConstraints}
            mirrored={true}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
          />
        )}

        {/* HUD Overlay */}
        {!imgSrc && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: 'none',
            zIndex: 10
          }}>
            {/* Corner Brackets */}
            <div style={{
              position: 'absolute',
              top: '10%',
              left: '10%',
              width: '80%',
              height: '80%',
              border: '2px solid transparent',
            }}>
              <div style={{ position: 'absolute', top: 0, left: 0, width: 40, height: 40, borderTop: '4px solid var(--primary-cyan)', borderLeft: '4px solid var(--primary-cyan)' }} />
              <div style={{ position: 'absolute', top: 0, right: 0, width: 40, height: 40, borderTop: '4px solid var(--primary-cyan)', borderRight: '4px solid var(--primary-cyan)' }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, width: 40, height: 40, borderBottom: '4px solid var(--primary-cyan)', borderLeft: '4px solid var(--primary-cyan)' }} />
              <div style={{ position: 'absolute', bottom: 0, right: 0, width: 40, height: 40, borderBottom: '4px solid var(--primary-cyan)', borderRight: '4px solid var(--primary-cyan)' }} />
            </div>

            {/* Crosshair */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 20,
              height: 20,
            }}>
              <div style={{ position: 'absolute', top: 9, left: 0, width: 20, height: 2, background: 'rgba(0, 255, 255, 0.5)' }} />
              <div style={{ position: 'absolute', top: 0, left: 9, width: 2, height: 20, background: 'rgba(0, 255, 255, 0.5)' }} />
            </div>

            {/* Tech Decoration Text */}
            <div style={{
              position: 'absolute',
              top: '12%',
              left: '10%',
              color: 'var(--primary-cyan)',
              fontSize: '0.8rem',
              fontFamily: 'monospace',
              opacity: 0.8
            }}>
              录制中 ● [高清]
            </div>
            <div style={{
              position: 'absolute',
              bottom: '12%',
              right: '10%',
              color: 'var(--primary-cyan)',
              fontSize: '0.8rem',
              fontFamily: 'monospace',
              opacity: 0.8
            }}>
              目标锁定：已激活
            </div>
          </div>
        )}

        {/* Flash Overlay */}
        {flash && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'white',
            zIndex: 30
          }} />
        )}

        {/* Countdown Overlay */}
        {countdown !== null && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: '10rem',
            color: 'var(--primary-cyan)',
            fontWeight: 'bold',
            textShadow: '0 0 30px var(--primary-cyan)',
            zIndex: 25,
            fontFamily: 'monospace'
          }}>
            {countdown > 0 ? countdown : '拍摄中'}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="glass-panel" style={{
        height: 180,
        width: '100%',
        background: 'rgba(0,0,0,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        padding: '0 40px',
        borderTop: '1px solid rgba(0,255,255,0.2)',
        borderRadius: '20px 20px 0 0',
        backdropFilter: 'blur(20px)',
        zIndex: 20
      }}>
        {imgSrc ? (
          <>
            <button
              onClick={handleRetake}
              className="glass-panel"
              style={{
                background: 'rgba(255, 77, 79, 0.2)',
                border: '1px solid #ff4d4f',
                borderRadius: '50%',
                width: 70,
                height: 70,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ff4d4f',
                cursor: 'pointer'
              }}
            >
              <RotateCcw size={28} />
            </button>

            <button
              onClick={handleConfirm}
              style={{
                background: 'var(--primary-cyan)',
                border: 'none',
                borderRadius: '50%',
                width: 90,
                height: 90,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#000',
                boxShadow: '0 0 30px rgba(0, 255, 255, 0.4)',
                cursor: 'pointer'
              }}
            >
              <Check size={40} />
            </button>
          </>
        ) : (
          <button
            onClick={startCountdown}
            disabled={countdown !== null}
            style={{
              background: 'transparent',
              border: '2px solid var(--primary-cyan)',
              borderRadius: '50%',
              width: 90,
              height: 90,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary-cyan)',
              boxShadow: '0 0 20px rgba(0, 255, 255, 0.2)',
              cursor: 'pointer',
              position: 'relative',
              transition: 'all 0.3s ease'
            }}
          >
            <div style={{
              width: 76,
              height: 76,
              borderRadius: '50%',
              background: 'rgba(0, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Camera size={40} />
            </div>
          </button>
        )}
      </div>
    </div>
  );
};
