import React, { useRef, useState } from 'react';
import Cropper, { ReactCropperElement } from "react-cropper";
import "cropperjs/dist/cropper.css";
import { Button, Space, message } from 'antd';
import { RotateLeftOutlined, RotateRightOutlined, CheckOutlined, UndoOutlined } from '@ant-design/icons';
import { useAppStore } from '@/store/useAppStore';
import { uploadImage } from '@/services/conversion';

export const ImageEditor: React.FC = () => {
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
          startTask(res.data.taskId);
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
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
      <div style={{ width: '100%', height: '500px', background: '#333' }}>
        <Cropper
          src={previewUrl || ''}
          style={{ height: '100%', width: '100%' }}
          initialAspectRatio={NaN} // Free crop
          guides={true}
          viewMode={1}
          ref={cropperRef}
          background={false}
          responsive={true}
          autoCropArea={1}
        />
      </div>
      
      <Space>
        <Button icon={<UndoOutlined />} onClick={reset}>Reset</Button>
        <Button icon={<RotateLeftOutlined />} onClick={() => handleRotate(-90)}>Rotate Left</Button>
        <Button icon={<RotateRightOutlined />} onClick={() => handleRotate(90)}>Rotate Right</Button>
        <Button type="primary" icon={<CheckOutlined />} loading={loading} onClick={handleConfirm}>
          Start Processing
        </Button>
      </Space>
    </div>
  );
};
