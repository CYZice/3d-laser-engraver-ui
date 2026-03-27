import { uploadImage } from '@/services/conversion';
import { useAppStore } from '@/store/useAppStore';
import { CheckOutlined, RotateLeftOutlined, RotateRightOutlined, UndoOutlined } from '@ant-design/icons';
import { Button, Space, message } from 'antd';
import "cropperjs/dist/cropper.css";
import React, { useRef, useState } from 'react';
import Cropper, { ReactCropperElement } from "react-cropper";

export const ImageEditor: React.FC<{ onUploadSuccess?: (uploadId: string) => void }> = ({ onUploadSuccess }) => {
  const { previewUrl, reset } = useAppStore();
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
        message.error('图片裁剪失败');
        return;
      }

      try {
        const res = await uploadImage(blob);
        if (res.code === 200) {
          if (onUploadSuccess) {
            onUploadSuccess(res.data.uploadId);
          }
        } else {
          message.error('上传失败');
        }
      } catch (error) {
        message.error('上传异常');
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
      <div style={{ alignSelf: 'flex-start', marginBottom: '10px' }}>
        <div className="glow-text" style={{
          fontSize: '1.8rem',
          color: 'var(--primary-cyan)',
          letterSpacing: '2px'
        }}>
          图像编辑
        </div>
        <div style={{ fontSize: '0.85rem', color: 'rgba(0,255,255,0.75)', letterSpacing: '2px' }}>
          IMAGE EDITOR
        </div>
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
            重置
          </Button>
          <Button
            ghost
            size="large"
            icon={<RotateLeftOutlined />}
            onClick={() => handleRotate(-90)}
          >
            左旋转
          </Button>
          <Button
            ghost
            size="large"
            icon={<RotateRightOutlined />}
            onClick={() => handleRotate(90)}
          >
            右旋转
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
            开始处理
          </Button>
        </Space>
      </div>
    </div>
  );
};
