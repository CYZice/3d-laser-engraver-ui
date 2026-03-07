import { uploadImage } from '@/services/conversion';
import { useAppStore } from '@/store/useAppStore';
import { CheckOutlined, RotateLeftOutlined, RotateRightOutlined, UndoOutlined } from '@ant-design/icons';
import { Button, Space, message } from 'antd';
import "cropperjs/dist/cropper.css";
import React, { useRef, useState } from 'react';
import Cropper, { ReactCropperElement } from "react-cropper";

export const ImageEditor: React.FC<{ onUploadSuccess?: (taskId: string) => void }> = ({ onUploadSuccess }) => {
  const { previewUrl, startTask, reset } = useAppStore();
  const cropperRef = useRef<ReactCropperElement>(null);
  const [loading, setLoading] = useState(false);

  const handleRotate = (degree: number) => {
    cropperRef.current?.cropper.rotate(degree);
  };

  const handleConfirm = () => {
    const cropper = cropperRef.current?.cropper;
    if (!cropper) return;

    setLoading(true);
    cropper.getCroppedCanvas().toBlob(async (blob) => {
      if (!blob) {
        setLoading(false);
        message.error('Failed to crop image');
        return;
      }

      try {
        const res = await uploadImage(blob);
        if (res.code === 200) {
          if (onUploadSuccess) {
            onUploadSuccess(res.data.taskId);
          } else {
            startTask(res.data.taskId);
          }
        } else {
          message.error('Upload failed');
        }
      } catch (error) {
        message.error('Upload error');
        console.error(error);
      } finally {
        setLoading(false);
      }
    }, 'image/jpeg');
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '20px',
      height: '100%',
      padding: '20px'
    }}>
      <div className="glow-text" style={{
        alignSelf: 'flex-start',
        fontSize: '1.5rem',
        color: 'var(--primary-cyan)',
        marginBottom: '10px',
        letterSpacing: '2px'
      }}>
        IMAGE_PROCESSOR // EDIT
      </div>

      <div className="tech-border" style={{
        width: '100%',
        flex: 1,
        background: '#111',
        borderRadius: '8px',
        overflow: 'hidden',
        position: 'relative'
      }}>
        <Cropper
          src={previewUrl || ''}
          style={{ height: '100%', width: '100%' }}
          initialAspectRatio={NaN} // Free crop
          guides={true}
          viewMode={1}
          ref={cropperRef}
          background={false}
          responsive={true}
          autoCropArea={0.8}
        />

        {/* Decorative corners */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: 20, height: 20, borderTop: '2px solid var(--primary-cyan)', borderLeft: '2px solid var(--primary-cyan)', zIndex: 10 }} />
        <div style={{ position: 'absolute', top: 0, right: 0, width: 20, height: 20, borderTop: '2px solid var(--primary-cyan)', borderRight: '2px solid var(--primary-cyan)', zIndex: 10 }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, width: 20, height: 20, borderBottom: '2px solid var(--primary-cyan)', borderLeft: '2px solid var(--primary-cyan)', zIndex: 10 }} />
        <div style={{ position: 'absolute', bottom: 0, right: 0, width: 20, height: 20, borderBottom: '2px solid var(--primary-cyan)', borderRight: '2px solid var(--primary-cyan)', zIndex: 10 }} />
      </div>

      <div className="glass-panel" style={{ padding: '20px', borderRadius: '15px' }}>
        <Space size="large">
          <Button
            ghost
            size="large"
            icon={<UndoOutlined />}
            onClick={reset}
            style={{ color: '#ff4d4f', borderColor: '#ff4d4f' }}
          >
            RESET
          </Button>
          <Button
            ghost
            size="large"
            icon={<RotateLeftOutlined />}
            onClick={() => handleRotate(-90)}
          >
            ROTATE L
          </Button>
          <Button
            ghost
            size="large"
            icon={<RotateRightOutlined />}
            onClick={() => handleRotate(90)}
          >
            ROTATE R
          </Button>
          <Button
            type="primary"
            size="large"
            icon={<CheckOutlined />}
            loading={loading}
            onClick={handleConfirm}
            style={{
              minWidth: '150px',
              height: '40px',
              fontSize: '1.1rem'
            }}
          >
            PROCESS
          </Button>
        </Space>
      </div>
    </div>
  );
};
